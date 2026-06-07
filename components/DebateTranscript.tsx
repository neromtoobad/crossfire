'use client'

// Live debate transcript — renders the council's round-based argument as a
// chat thread, streaming token-by-token. Phase 9.1.

import { useEffect, useRef } from 'react'
import { CF } from '../lib/theme'

export type DebateMsg = {
  id: string
  round: number
  role: string
  text: string
  vote?: 'YES' | 'NO' | 'NEUTRAL'
  confidence?: number
  streaming: boolean
}

export type DebateRound = { round: number; title: string }

// Per-agent identity: letter + colour. Distinct hues that read on light.
const AGENT: Record<string, { letter: string; color: string; tint: string; desk: string }> = {
  MacroScout:  { letter: 'M', color: '#1D4ED8', tint: '#EFF4FF', desk: 'macro & regulation' },
  NewsHawk:    { letter: 'N', color: '#B45309', tint: '#FEF6E7', desk: 'news & catalysts' },
  CrowdPulse:  { letter: 'C', color: '#7C3AED', tint: '#F5F0FF', desk: 'sentiment & positioning' },
  BookWatcher: { letter: 'B', color: '#15803D', tint: '#ECFDF3', desk: 'price action & book' },
  Skeptic:     { letter: 'S', color: '#B91C1C', tint: '#FEF2F2', desk: 'adversarial refutation' },
}

function voteChip(vote?: 'YES' | 'NO' | 'NEUTRAL', confidence?: number, isSkeptic?: boolean) {
  if (!vote) return null
  const color = isSkeptic
    ? (confidence ?? 0) >= 0.5 ? CF.bear : CF.bull
    : vote === 'YES' ? CF.bull : vote === 'NO' ? CF.bear : CF.amber
  const tint = isSkeptic
    ? (confidence ?? 0) >= 0.5 ? CF.bearTint : CF.bullTint
    : vote === 'YES' ? CF.bullTint : vote === 'NO' ? CF.bearTint : CF.amberTint
  const label = isSkeptic
    ? `${(confidence ?? 0) >= 0.5 ? 'VETO' : 'allows'} · ${((confidence ?? 0) * 100).toFixed(0)}% refute`
    : `${vote} · ${((confidence ?? 0) * 100).toFixed(0)}%`
  return (
    <span className="mono" style={{
      padding: '2px 8px', borderRadius: 999, background: tint, color,
      border: `1px solid ${color}33`, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function DebateTranscript({
  messages,
  rounds,
}: {
  messages: DebateMsg[]
  rounds: DebateRound[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Auto-scroll to the bottom as new tokens stream in.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const roundTitle = (r: number) => rounds.find((x) => x.round === r)?.title ?? `Round ${r}`

  // Group consecutive messages by round so we can render dividers.
  const items: Array<{ kind: 'divider'; round: number } | { kind: 'msg'; msg: DebateMsg }> = []
  let lastRound = 0
  for (const m of messages) {
    if (m.round !== lastRound) {
      items.push({ kind: 'divider', round: m.round })
      lastRound = m.round
    }
    items.push({ kind: 'msg', msg: m })
  }

  return (
    <div
      ref={scrollRef}
      style={{
        background: CF.surface2,
        border: `1px solid ${CF.line}`,
        borderRadius: CF.radius.md,
        padding: '16px 18px',
        maxHeight: 520,
        overflowY: 'auto',
      }}
    >
      {items.map((it, i) => {
        if (it.kind === 'divider') {
          return (
            <div key={`d-${it.round}`} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: i === 0 ? '0 0 14px' : '20px 0 14px',
            }}>
              <span className="mono" style={{
                fontSize: 10, letterSpacing: 1.8, color: CF.ink3, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                ROUND {it.round} · {roundTitle(it.round).toUpperCase()}
              </span>
              <span style={{ flex: 1, height: 1, background: CF.line }} />
            </div>
          )
        }
        const m = it.msg
        const a = AGENT[m.role] ?? { letter: '?', color: CF.ink3, tint: CF.surface, desk: '' }
        const isSkeptic = m.role === 'Skeptic'
        return (
          <div key={m.id} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
            {/* avatar */}
            <span style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 8,
              background: a.tint, color: a.color, border: `1px solid ${a.color}33`,
              fontFamily: CF.mono, fontSize: 13, fontWeight: 700, marginTop: 1,
            }}>
              {a.letter}
            </span>
            {/* bubble */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: CF.body, fontWeight: 600, fontSize: 13.5, color: CF.ink }}>
                  {m.role}
                </span>
                <span className="mono" style={{ fontSize: 10, color: CF.ink4, letterSpacing: 0.3 }}>
                  {a.desk}
                </span>
                {!m.streaming ? voteChip(m.vote, m.confidence, isSkeptic) : null}
              </div>
              <div style={{
                fontFamily: CF.body, fontSize: 14, color: CF.ink, lineHeight: 1.55,
                background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: 8,
                borderLeft: `2.5px solid ${a.color}`,
                padding: '9px 12px',
              }}>
                {m.text || (m.streaming ? <span style={{ color: CF.ink3 }}>thinking…</span> : null)}
                {m.streaming && m.text ? (
                  <span style={{
                    display: 'inline-block', width: 7, height: 14, marginLeft: 2,
                    background: a.color, verticalAlign: 'text-bottom', borderRadius: 1,
                    animation: 'cf-cursor 1s steps(2) infinite',
                  }} />
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
      <style>{`@keyframes cf-cursor { 0%,100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  )
}
