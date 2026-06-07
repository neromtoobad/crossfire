'use client'

// Phase 9.2 — modal that sends a Polymarket watch market to the council and
// streams the live debate + verdict.

import { useEffect, useRef, useState } from 'react'
import { CF, alpha } from '../lib/theme'
import { DebateTranscript, type DebateMsg, type DebateRound } from './DebateTranscript'

export type WatchTarget = {
  question: string
  yesPrice: number      // 0..1
  slug: string
  eventSlug: string
}

type Verdict = {
  side: 'YES' | 'NO'
  confidence: number
  polymarketYes: number
  edgePts: number
  agreeing: number
  skepticVetoed: boolean
  passed: boolean
  reasons: string[]
  oneLiner: string
}

export function WatchDebateModal({ target, onClose }: { target: WatchTarget; onClose: () => void }) {
  const [msgs, setMsgs] = useState<DebateMsg[]>([])
  const [rounds, setRounds] = useState<DebateRound[]>([])
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [phase, setPhase] = useState<'running' | 'done' | 'error'>('running')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    ;(async () => {
      try {
        const res = await fetch('/api/scout/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: target.question, yesPrice: target.yesPrice, slug: target.slug }),
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) { setPhase('error'); setErrorMsg(`HTTP ${res.status}`); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const raw of lines) {
            const line = raw.trim()
            if (!line) continue
            let e: any
            try { e = JSON.parse(line) } catch { continue }
            applyEvent(e)
          }
        }
        setPhase((p) => (p === 'error' ? p : 'done'))
      } catch (e: any) {
        if (e?.name !== 'AbortError') { setPhase('error'); setErrorMsg(e?.message ?? String(e)) }
      }
    })()
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.slug])

  function applyEvent(e: any) {
    switch (e.type) {
      case 'debate-round':
        setRounds((cur) => cur.some((r) => r.round === e.round) ? cur : [...cur, { round: e.round, title: e.title }])
        return
      case 'debate-turn-start':
        setMsgs((cur) => [...cur, { id: `${e.round}-${e.role}-${cur.length}`, round: e.round, role: e.role, text: '', streaming: true }])
        return
      case 'debate-token':
        setMsgs((cur) => {
          const next = [...cur]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === e.role && next[i].round === e.round && next[i].streaming) {
              next[i] = { ...next[i], text: next[i].text + e.token }; break
            }
          }
          return next
        })
        return
      case 'debate-turn-end':
        setMsgs((cur) => {
          const next = [...cur]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === e.role && next[i].round === e.round && next[i].streaming) {
              next[i] = { ...next[i], streaming: false, vote: e.vote, confidence: e.confidence }; break
            }
          }
          return next
        })
        return
      case 'scout-verdict':
        setVerdict(e as Verdict)
        return
      case 'error':
        setPhase('error'); setErrorMsg(e.message)
        return
    }
  }

  const pmPct = Math.round(target.yesPrice * 100)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(11,12,15,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 760, background: CF.bg,
          border: `1px solid ${CF.line}`, borderRadius: CF.radius.xl,
          boxShadow: CF.shadow.pop, overflow: 'hidden',
        }}
      >
        {/* header */}
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${CF.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
        }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: CF.bull, marginBottom: 8 }}>
              ▸ COUNCIL SCOUT · LIVE DEBATE
            </div>
            <div style={{
              fontFamily: CF.display, fontSize: 21, fontWeight: 500, color: CF.ink,
              letterSpacing: -0.4, lineHeight: 1.25, fontVariationSettings: '"opsz" 48',
            }}>
              {target.question}
            </div>
            <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 8 }}>
              Polymarket live: <span className="tnum" style={{ color: CF.ink, fontWeight: 600 }}>{pmPct}% YES</span>
              {' · '}the council debates it cold
            </div>
          </div>
          <button onClick={onClose} aria-label="close" style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
            background: CF.surface, border: `1px solid ${CF.line2}`, color: CF.ink2,
            fontFamily: CF.body, fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>

        {/* verdict (sticky top once ready) */}
        {verdict ? (
          <div style={{
            padding: '14px 24px',
            background: verdict.passed
              ? (verdict.side === 'YES' ? CF.bullTint : CF.bearTint)
              : CF.surface2,
            borderBottom: `1px solid ${CF.line}`,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <span className="mono" style={{
              padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
              background: CF.bg,
              color: verdict.side === 'YES' ? CF.bull : CF.bear,
              border: `1px solid ${alpha(verdict.side === 'YES' ? CF.bull : CF.bear, 33)}`,
            }}>
              {verdict.passed ? `BUY ${verdict.side}` : `LEAN ${verdict.side} · NO CALL`}
            </span>
            <span className="mono tnum" style={{ fontSize: 12.5, color: CF.ink }}>
              council {(verdict.confidence * 100).toFixed(0)}% · polymarket {Math.round(verdict.polymarketYes * 100)}% YES ·
              <span style={{ color: verdict.edgePts > 0 ? (verdict.side === 'YES' ? CF.bull : CF.bear) : CF.ink3, fontWeight: 600 }}>
                {' '}{verdict.edgePts > 0 ? '+' : ''}{verdict.edgePts}pts edge
              </span>
            </span>
            <span style={{ fontFamily: CF.body, fontSize: 13, color: CF.ink2, flexBasis: '100%' }}>
              {verdict.oneLiner}
            </span>
          </div>
        ) : null}

        {/* debate transcript */}
        <div style={{ padding: '18px 24px 24px' }}>
          {msgs.length === 0 && phase === 'running' ? (
            <div className="mono" style={{ fontSize: 12, color: CF.ink3, padding: '20px 0' }}>
              · convening the desk… (a full debate runs ~30–45s)
            </div>
          ) : (
            <DebateTranscript messages={msgs} rounds={rounds} />
          )}

          {phase === 'error' ? (
            <div className="mono" style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 8,
              background: CF.bearTint, border: `1px solid ${CF.bear}`, color: CF.bearInk, fontSize: 12,
            }}>
              × {errorMsg ?? 'debate failed'}
            </div>
          ) : null}

          {phase === 'done' && !verdict ? (
            <div className="mono" style={{ marginTop: 12, fontSize: 12, color: CF.ink3 }}>
              · debate complete — no verdict produced.
            </div>
          ) : null}

          {/* footer */}
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: `1px solid ${CF.line}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          }}>
            <a
              href={`https://polymarket.com/event/${target.eventSlug}?market=${target.slug}`}
              target="_blank" rel="noreferrer"
              className="mono" style={{ fontSize: 11.5, color: CF.ink2 }}
            >
              open on Polymarket ↗
            </a>
            <button onClick={onClose} style={{
              padding: '8px 16px', borderRadius: CF.radius.md, border: 'none',
              background: CF.ink, color: CF.bg, fontFamily: CF.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {phase === 'running' ? 'Close (keeps running)' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
