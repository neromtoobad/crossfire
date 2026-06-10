'use client'

// THE WAR ROOM — a conference room where the five agents debate a market live.
// Pick a topic (any market), watch them argue (Venice), see each agent's
// position land, then back or fade the lead agent.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DebateTranscript, type DebateMsg, type DebateRound } from './DebateTranscript'
import { FadeFollow } from './FadeFollow'
import { PUNDITS, PUNDIT_ROLES } from '../lib/pundits'
import type { PublishedCall, AgentRole } from '../lib/calls-data'
import { CF, alpha } from '../lib/theme'

const WINNER_ID = 'winner'
const WINNER_TITLE = 'Who lifts the 2026 FIFA World Cup?'

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
  const started = useRef(false)

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

  const selectedCall = selectedId === WINNER_ID ? null : callById.get(selectedId)
  const topicTitle = selectedId === WINNER_ID ? WINNER_TITLE : selectedCall?.marketTitle ?? ''
  const impliedProbYes = selectedCall?.marketImpliedYes ?? 0.5

  function apply(e: { type: string; round?: number; title?: string; role?: AgentRole; token?: string; vote?: string; confidence?: number; message?: string }) {
    switch (e.type) {
      case 'debate-round':
        setRounds((cur) => (cur.some((r) => r.round === e.round) ? cur : [...cur, { round: e.round!, title: e.title! }]))
        break
      case 'debate-turn-start':
        setMessages((cur) => [...cur, { id: `${e.round}-${e.role}-${cur.length}`, round: e.round!, role: e.role!, text: '', streaming: true }])
        break
      case 'debate-token':
        setMessages((cur) => {
          const next = [...cur]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === e.role && next[i].round === e.round && next[i].streaming) { next[i] = { ...next[i], text: next[i].text + e.token }; break }
          }
          return next
        })
        break
      case 'debate-turn-end':
        setMessages((cur) => {
          const next = [...cur]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === e.role && next[i].round === e.round && next[i].streaming) { next[i] = { ...next[i], streaming: false, vote: e.vote, confidence: e.confidence }; break }
          }
          return next
        })
        if (e.role && e.vote) setPositions((p) => ({ ...p, [e.role!]: { vote: e.vote!, confidence: e.confidence ?? 0.5 } }))
        break
      case 'error':
        setError(e.message || 'Venice was busy — try again.')
        break
    }
  }

  async function start() {
    if (running) return
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
        for (const line of lines) { if (!line.trim()) continue; let e; try { e = JSON.parse(line) } catch { continue } apply(e) }
      }
    } catch { setError('Lost the connection — try again.') }
    setRunning(false); setDone(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* the table — five participants */}
      <div style={{ background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, padding: '18px 20px', boxShadow: CF.shadow.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.8, color: running ? CF.bear : CF.ink3, display: 'flex', alignItems: 'center', gap: 8 }}>
            {running ? <><span className="cf-live-dot" aria-hidden /> IN SESSION</> : done ? 'SESSION ADJOURNED' : 'THE PANEL'}
          </div>
          <span className="mono" style={{ fontSize: 10.5, color: CF.ink4 }}>5 agents · Venice</span>
        </div>
        <div className="cf-g5" style={{ gap: 10 }}>
          {PUNDIT_ROLES.map((role) => {
            const p = PUNDITS[role]
            const pos = positions[role]
            const vColor = pos?.vote === 'YES' ? CF.bull : pos?.vote === 'NO' ? CF.bear : CF.ink3
            return (
              <div key={role} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, textAlign: 'center' }}>
                <span style={{ width: 52, height: 52, borderRadius: 10, display: 'inline-flex', overflow: 'hidden', border: `2px solid ${p.color}`, boxShadow: pos ? `0 0 16px ${alpha(p.color, 55)}` : `0 0 8px ${alpha(p.color, 20)}`, transition: 'box-shadow 240ms ease' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.portrait} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 16%' }} />
                </span>
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

      {/* topic + start */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={running} style={{
          flex: 1, minWidth: 260, padding: '11px 14px', borderRadius: CF.radius.md, background: CF.surface, color: CF.ink,
          border: `1px solid ${CF.line}`, fontFamily: CF.body, fontSize: 14, cursor: running ? 'not-allowed' : 'pointer',
        }}>
          <option value={WINNER_ID}>🏆 {WINNER_TITLE}</option>
          {calls.map((c) => <option key={c.id} value={c.id}>{c.marketTitle}</option>)}
        </select>
        <button onClick={start} disabled={running} className="cf-press" style={{
          padding: '11px 22px', borderRadius: CF.radius.md, border: 'none', cursor: running ? 'wait' : 'pointer',
          background: running ? CF.surface2 : CF.ink, color: running ? CF.ink3 : CF.bg, fontFamily: CF.body, fontWeight: 700, fontSize: 13.5,
        }}>{running ? 'Debating…' : done ? 'Debate again' : 'Open the floor'}</button>
      </div>

      {error ? <div className="mono" style={{ fontSize: 12.5, color: CF.bear, padding: '4px 2px' }}>× {error}</div> : null}

      {/* the debate */}
      {(messages.length > 0 || running) && (
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
