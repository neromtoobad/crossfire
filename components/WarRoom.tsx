'use client'

// THE WAR ROOM — a broadcast booth where the five agents debate a market.
// The panel forms its arguments (Venice), then takes the floor ONE AT A TIME,
// in order: PHOENIX, then ORION, then NEXUS, ECHO, VEGA. Each agent's line is
// spoken aloud in its own voice, its seat lights up ON AIR with a live audio
// equalizer, and its line is revealed in the transcript as it speaks. No
// clicking. Then back or fade the lead agent.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DebateTranscript, type DebateMsg, type DebateRound } from './DebateTranscript'
import { FadeFollow } from './FadeFollow'
import { AgentAvatar } from './AgentAvatar'
import { PUNDITS, PUNDIT_ROLES } from '../lib/pundits'
import type { PublishedCall, AgentRole } from '../lib/calls-data'
import { CF, alpha } from '../lib/theme'

const WINNER_ID = 'winner'
const WINNER_TITLE = 'Who lifts the 2026 FIFA World Cup?'

type Slot = { role: AgentRole; text: string; vote?: 'YES' | 'NO' | 'NEUTRAL'; confidence?: number }

// an animated audio equalizer in the speaker's colour — the "fun" visual
function Equalizer({ color, bars = 18 }: { color: string; bars?: number }) {
  return (
    <div aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2.5, height: 20 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 3, height: '100%', borderRadius: 2, background: color,
          transformOrigin: 'bottom', display: 'inline-block',
          animation: `cf-eq ${(0.5 + ((i * 7) % 9) * 0.07).toFixed(2)}s ease-in-out ${(i * 0.045).toFixed(2)}s infinite`,
          boxShadow: `0 0 6px ${alpha(color, 60)}`,
        }} />
      ))}
    </div>
  )
}

export function WarRoom({ calls }: { calls: PublishedCall[] }) {
  const params = useSearchParams()
  const callById = new Map(calls.map((c) => [c.id, c]))

  const [selectedId, setSelectedId] = useState<string>(WINNER_ID)
  const [messages, setMessages] = useState<DebateMsg[]>([])
  const [rounds, setRounds] = useState<DebateRound[]>([])
  const [positions, setPositions] = useState<Partial<Record<AgentRole, { vote: string; confidence: number }>>>({})
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [winnerPicks, setWinnerPicks] = useState<Record<string, { country: string; flag: string }>>({})

  // ── voiced broadcast state ──────────────────────────────────────────────
  const [voiceOn, setVoiceOn] = useState(true)
  const [speaking, setSpeaking] = useState<Slot | null>(null)
  const voiceOnRef = useRef(true)
  // Turns are generated mostly in parallel but REVEALED + spoken in canonical
  // role order — slots are indexed by PUNDIT_ROLES position; the sequencer walks
  // them in order, waiting for the next to be ready.
  const slotsRef = useRef<(Slot | null)[]>([])
  const playIdxRef = useRef(0)
  const seqRef = useRef(false)
  const streamDoneRef = useRef(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioResolveRef = useRef<(() => void) | null>(null)
  const audioCacheRef = useRef<Map<string, string>>(new Map())
  const turnTextRef = useRef<Record<string, string>>({})
  const runIdRef = useRef(0)

  // preselect from ?topic=
  useEffect(() => {
    const t = params.get('topic')
    if (t && (t === WINNER_ID || callById.has(t))) setSelectedId(t)
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  // the agents' country picks — shown on the seats for the winner debate
  useEffect(() => {
    fetch('/api/winner-picks').then((r) => r.json()).then((d) => {
      if (d.picks?.length) setWinnerPicks(Object.fromEntries(d.picks.map((p: { role: string; country: string; flag: string }) => [p.role, { country: p.country, flag: p.flag }])))
    }).catch(() => {})
  }, [])

  useEffect(() => { voiceOnRef.current = voiceOn; if (!voiceOn) stopAudio() }, [voiceOn])
  useEffect(() => () => stopAudio(), []) // stop on unmount

  const selectedCall = selectedId === WINNER_ID ? null : callById.get(selectedId)
  const topicTitle = selectedId === WINNER_ID ? WINNER_TITLE : selectedCall?.marketTitle ?? ''
  const impliedProbYes = selectedCall?.marketImpliedYes ?? 0.5

  // ── voice playback ────────────────────────────────────────────────────────
  function stopAudio() {
    const a = audioElRef.current
    if (a) { a.pause(); a.onended = null; a.onerror = null }
    audioElRef.current = null
    if (audioResolveRef.current) { const r = audioResolveRef.current; audioResolveRef.current = null; r() }
    setSpeaking(null)
  }

  async function fetchAudio(role: AgentRole, text: string): Promise<string | null> {
    const handle = PUNDITS[role].handle
    const key = `${handle}|${text}`
    const hit = audioCacheRef.current.get(key)
    if (hit) return hit
    try {
      const res = await fetch('/api/voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, text }),
      })
      if (!res.ok) return null
      const url = URL.createObjectURL(await res.blob())
      audioCacheRef.current.set(key, url)
      return url
    } catch { return null }
  }

  // play a line; resolves true if it actually spoke to the end, false otherwise
  async function playLine(role: AgentRole, text: string, myRun: number): Promise<boolean> {
    const url = await fetchAudio(role, text)
    if (!url || myRun !== runIdRef.current || !voiceOnRef.current) return false
    return await new Promise<boolean>((resolve) => {
      const a = new Audio(url)
      audioElRef.current = a
      let settled = false
      const finish = (ok: boolean) => { if (settled) return; settled = true; audioResolveRef.current = null; resolve(ok) }
      audioResolveRef.current = () => finish(false)
      a.onended = () => finish(true)
      a.onerror = () => finish(false)
      a.play().catch(() => finish(false))
    })
  }

  function readMs(text: string): number {
    const words = text.trim().split(/\s+/).length
    return Math.min(8000, Math.max(2600, words * 230))
  }
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  // the sequencer: reveal + voice each turn strictly in order
  async function runSequencer(myRun: number) {
    if (seqRef.current) return
    seqRef.current = true
    try {
      while (playIdxRef.current < slotsRef.current.length) {
        if (myRun !== runIdRef.current) break
        const item = slotsRef.current[playIdxRef.current]
        if (!item) {
          // next speaker not ready yet
          if (!streamDoneRef.current) return // wait — a later turn-end re-kicks us
          if (!slotsRef.current.slice(playIdxRef.current).some(Boolean)) break
          playIdxRef.current++
          continue
        }
        // reveal this turn (transcript + caption + seat vote), in order
        setSpeaking(item)
        setMessages((cur) => [...cur, {
          id: `m-${playIdxRef.current}-${item.role}`, round: 1, role: item.role,
          text: item.text, vote: item.vote, confidence: item.confidence, streaming: false,
        }])
        if (item.vote) setPositions((p) => ({ ...p, [item.role]: { vote: item.vote!, confidence: item.confidence ?? 0.5 } }))

        let spoke = false
        if (voiceOnRef.current) spoke = await playLine(item.role, item.text, myRun)
        if (myRun !== runIdRef.current) break
        if (!spoke) await sleep(readMs(item.text)) // muted (or audio failed) → paced read
        playIdxRef.current++
      }
    } finally {
      seqRef.current = false
      const slots = slotsRef.current
      const allDone = streamDoneRef.current && (playIdxRef.current >= slots.length || !slots.slice(playIdxRef.current).some(Boolean))
      if (myRun === runIdRef.current && allDone) setSpeaking(null)
    }
  }

  function apply(e: { type: string; round?: number; title?: string; role?: AgentRole; token?: string; vote?: 'YES' | 'NO' | 'NEUTRAL'; confidence?: number; message?: string }, myRun: number) {
    const key = `${e.round}-${e.role}`
    switch (e.type) {
      case 'debate-round':
        setRounds((cur) => (cur.some((r) => r.round === e.round) ? cur : [...cur, { round: e.round!, title: e.title! }]))
        break
      case 'debate-turn-start':
        turnTextRef.current[key] = '' // start collecting this turn's text (not shown yet)
        break
      case 'debate-token':
        turnTextRef.current[key] = (turnTextRef.current[key] ?? '') + (e.token ?? '')
        break
      case 'debate-turn-end': {
        const text = (turnTextRef.current[key] ?? '').trim()
        if (e.role && text) {
          const idx = PUNDIT_ROLES.indexOf(e.role)
          if (idx >= 0) slotsRef.current[idx] = { role: e.role, text, vote: e.vote, confidence: e.confidence }
          void fetchAudio(e.role, text) // prefetch so the broadcast has no gap
          void runSequencer(myRun)
        }
        break
      }
      case 'error':
        setError(e.message || 'Venice was busy — try again.')
        break
    }
  }

  async function start() {
    if (running) return
    runIdRef.current += 1
    const myRun = runIdRef.current
    stopAudio()
    slotsRef.current = new Array(PUNDIT_ROLES.length).fill(null)
    playIdxRef.current = 0; seqRef.current = false; streamDoneRef.current = false; turnTextRef.current = {}
    setMessages([]); setRounds([]); setPositions({}); setError(''); setDone(false); setRunning(true)
    try {
      const payload = selectedId === WINNER_ID ? { winner: true } : { marketTitle: topicTitle, impliedProbYes }
      const res = await fetch('/api/debate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      for (;;) {
        const { value, done: rdone } = await reader.read()
        if (rdone) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) { if (!line.trim()) continue; let ev; try { ev = JSON.parse(line) } catch { continue } apply(ev, myRun) }
      }
    } catch { setError('Lost the connection — try again.') }
    streamDoneRef.current = true
    void runSequencer(myRun) // flush any remaining turns
    setRunning(false); setDone(true)
  }

  const speakingPundit = speaking ? PUNDITS[speaking.role] : null
  // deliberating = generating but nothing revealed/spoken yet
  const deliberating = running && !speaking && messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* the table — five participants */}
      <div style={{ background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, padding: '18px 20px', boxShadow: CF.shadow.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.8, color: running ? CF.bear : CF.ink3, display: 'flex', alignItems: 'center', gap: 8 }}>
            {speaking ? <><span className="cf-live-dot" aria-hidden /> ON AIR</>
              : deliberating ? <>FORMING ARGUMENTS<span className="cf-think" style={{ display: 'inline-flex', gap: 3, marginLeft: 4 }}><span style={{ width: 4, height: 4, borderRadius: 9, background: 'currentColor' }} /><span style={{ width: 4, height: 4, borderRadius: 9, background: 'currentColor' }} /><span style={{ width: 4, height: 4, borderRadius: 9, background: 'currentColor' }} /></span></>
              : done ? 'SESSION ADJOURNED' : 'THE PANEL'}
          </div>
          <span className="mono" style={{ fontSize: 10.5, color: CF.ink4 }}>5 agents · Venice voice</span>
        </div>
        <div className="cf-g5" style={{ gap: 10 }}>
          {PUNDIT_ROLES.map((role) => {
            const p = PUNDITS[role]
            const pos = positions[role]
            const isLive = speaking?.role === role
            const vColor = pos?.vote === 'YES' ? CF.bull : pos?.vote === 'NO' ? CF.bear : CF.ink3
            return (
              <div key={role} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, textAlign: 'center', position: 'relative' }}>
                <span style={{
                  width: 52, height: 52, borderRadius: 10, display: 'inline-flex', overflow: 'hidden',
                  border: `2px solid ${p.color}`,
                  boxShadow: isLive ? `0 0 0 3px ${alpha(p.color, 45)}, 0 0 22px ${alpha(p.color, 85)}` : pos ? `0 0 16px ${alpha(p.color, 55)}` : `0 0 8px ${alpha(p.color, 20)}`,
                  transform: isLive ? 'scale(1.13)' : 'scale(1)',
                  transition: 'box-shadow 240ms ease, transform 240ms ease',
                  animation: deliberating ? 'cf-breathe 1.6s ease-in-out infinite' : undefined,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.portrait} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 16%' }} />
                </span>
                {isLive ? (
                  <span className="mono" style={{ position: 'absolute', top: -7, fontSize: 7.5, fontWeight: 800, letterSpacing: 0.6, color: '#fff', background: CF.bear, padding: '2px 5px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span className="cf-live-dot" style={{ width: 5, height: 5 }} aria-hidden /> ON AIR
                  </span>
                ) : null}
                <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 11.5, color: CF.ink, letterSpacing: 0.3 }}>{p.handle}</span>
                {selectedId === WINNER_ID && winnerPicks[role] ? (
                  <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: p.color, padding: '1px 6px', borderRadius: 999, background: alpha(p.color, 12), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>{winnerPicks[role].flag}</span>{winnerPicks[role].country}
                  </span>
                ) : pos ? (
                  <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: vColor, padding: '1px 6px', borderRadius: 999, background: alpha(vColor, 12) }}>{pos.vote} {Math.round(pos.confidence * 100)}%</span>
                ) : (
                  <span className="mono" style={{ fontSize: 9, color: CF.ink4 }}>{p.persona}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* topic + start + voice toggle */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={running} style={{
          flex: 1, minWidth: 220, padding: '11px 14px', borderRadius: CF.radius.md, background: CF.surface, color: CF.ink,
          border: `1px solid ${CF.line}`, fontFamily: CF.body, fontSize: 14, cursor: running ? 'not-allowed' : 'pointer',
        }}>
          <option value={WINNER_ID}>🏆 {WINNER_TITLE}</option>
          {calls.map((c) => <option key={c.id} value={c.id}>{c.marketTitle}</option>)}
        </select>
        <button onClick={() => setVoiceOn((v) => !v)} className="cf-press" title="Toggle spoken broadcast" style={{
          padding: '11px 14px', borderRadius: CF.radius.md, cursor: 'pointer', fontFamily: CF.mono, fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
          background: voiceOn ? alpha(CF.gold, 14) : CF.surface, color: voiceOn ? CF.gold : CF.ink3,
          border: `1px solid ${voiceOn ? alpha(CF.gold, 45) : CF.line}`,
        }}>{voiceOn ? '🔊 VOICE' : '🔇 MUTED'}</button>
        <button onClick={start} disabled={running} className="cf-press" style={{
          padding: '11px 22px', borderRadius: CF.radius.md, border: 'none', cursor: running ? 'wait' : 'pointer',
          background: running ? CF.surface2 : CF.ink, color: running ? CF.ink3 : CF.bg, fontFamily: CF.body, fontWeight: 700, fontSize: 13.5,
        }}>{running ? (speaking ? 'On air…' : 'Preparing…') : done ? 'Debate again' : '▶ Open the floor'}</button>
      </div>

      {error ? <div className="mono" style={{ fontSize: 12.5, color: CF.bear, padding: '4px 2px' }}>× {error}</div> : null}

      {/* broadcast caption — the speaking agent, lower-third with a live equalizer */}
      {speaking && speakingPundit ? (
        <div className="cf-rise" style={{
          display: 'flex', gap: 14, alignItems: 'center',
          background: `linear-gradient(90deg, ${alpha(speakingPundit.color, 18)}, ${CF.surface})`,
          border: `1px solid ${alpha(speakingPundit.color, 45)}`, borderLeft: `3px solid ${speakingPundit.color}`,
          borderRadius: CF.radius.lg, padding: '14px 18px', boxShadow: CF.shadow.card,
        }}>
          <span style={{ animation: 'cf-breathe 1.4s ease-in-out infinite', flexShrink: 0 }}>
            <AgentAvatar role={speaking.role} size={54} radius={12} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="mono" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, color: speakingPundit.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="cf-live-dot" style={{ width: 6, height: 6 }} aria-hidden /> {speakingPundit.handle} · SPEAKING
              </span>
              <Equalizer color={speakingPundit.color} />
            </div>
            <div style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink, lineHeight: 1.5 }}>{speaking.text}</div>
          </div>
        </div>
      ) : deliberating ? (
        <div className="mono cf-rise" style={{ fontSize: 12.5, color: CF.ink3, padding: '10px 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="cf-live-dot" aria-hidden /> The panel is forming their arguments — they’ll take the floor one at a time…
        </div>
      ) : null}

      {/* the transcript — fills one speaker at a time, in sync with the voice */}
      {messages.length > 0 && (
        <DebateTranscript messages={messages} rounds={rounds} />
      )}

      {/* back or fade — for a binary call topic, the existing kit-backed bet */}
      {selectedCall ? (
        <div style={{ marginTop: 4 }}>
          <FadeFollow call={selectedCall} />
        </div>
      ) : done && !error ? (
        <div className="mono" style={{ fontSize: 12.5, color: CF.ink3, padding: '8px 2px' }}>
          Backing the winner market is coming soon — pick a match market above to fade or back an agent now.
        </div>
      ) : null}
    </div>
  )
}
