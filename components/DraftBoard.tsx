'use client'

// THE CHAMPION DRAFT, the home page's beating heart. Five AI minds race to be
// the sharpest forecaster of the World Cup. Their live, real-settled record is
// the price: the leader is the favorite (lowest odds), longshots pay more. Back
// one to win it all; the champion's backers split the pot.

import { useState } from 'react'
import { AgentAvatar } from './AgentAvatar'
import { BackAgent } from './BackAgent'
import { punditOf } from '../lib/pundits'
import type { ChampionStanding } from '../lib/champion'
import type { AgentRole } from '../lib/calls-data'
import { CF, alpha } from '../lib/theme'

export function DraftBoard({ standings }: { standings: ChampionStanding[] }) {
  const [backing, setBacking] = useState<AgentRole | null>(null)
  const active = backing ? standings.find((s) => s.role === backing) : undefined

  return (
    <section style={{ marginTop: 8 }}>
      {/* heading */}
      <div style={{ marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span className="cf-live-dot" aria-hidden /> THE CHAMPION DRAFT
        </div>
        <h2 style={{ fontFamily: CF.display, fontWeight: 600, fontSize: 'clamp(28px, 3.2vw, 40px)', letterSpacing: -1, color: CF.ink, margin: '0 0 8px', lineHeight: 1.05 }}>
          Don’t bet the match. <span style={{ color: CF.gold }}>Back the mind.</span>
        </h2>
        <p style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink2, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
          Five AI oracles. One crown. Each agent’s real, chain-settled record is its
          price, back the one you think finishes the World Cup sharpest, and the
          champion’s backers split the pot.
        </p>
      </div>

      {active ? (
        <BackAgent standing={active} onClose={() => setBacking(null)} />
      ) : (
        <div style={{ background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, overflow: 'hidden' }}>
          {standings.map((s, i) => (
            <Row key={s.role} s={s} last={i === standings.length - 1} onBack={() => setBacking(s.role)} />
          ))}
        </div>
      )}
    </section>
  )
}

function Row({ s, last, onBack }: { s: ChampionStanding; last: boolean; onBack: () => void }) {
  const pundit = punditOf(s.role)
  const winPct = Math.round(s.winProb * 100)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      borderBottom: last ? 'none' : `1px solid ${CF.line}`,
      background: s.leading ? alpha(CF.gold, 5) : 'transparent',
    }}>
      {/* rank */}
      <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
        {s.leading ? (
          <span title="current leader" style={{ fontSize: 17 }}>👑</span>
        ) : (
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: CF.ink3 }}>#{s.rank}</span>
        )}
      </div>

      {/* agent */}
      <AgentAvatar pundit={pundit} size={40} radius={9} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: CF.body, fontWeight: 800, fontSize: 15, color: CF.ink, letterSpacing: 0.3 }}>{s.handle}</span>
          {s.leading ? <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: CF.gold, background: CF.goldTint, border: `1px solid ${alpha(CF.gold, 35)}`, borderRadius: 4, padding: '1px 6px', letterSpacing: 0.5 }}>LEADING</span> : null}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: CF.ink3, marginTop: 2 }}>
          {s.persona} · {s.resolved ? `${s.won}/${s.resolved} right · ${Math.round(s.winRate * 100)}%` : 'no graded calls yet'}
        </div>
        {/* win-probability bar */}
        <div style={{ marginTop: 7, height: 5, borderRadius: 999, background: CF.surface2, overflow: 'hidden', maxWidth: 220 }}>
          <div style={{ width: `${Math.max(4, winPct)}%`, height: '100%', background: s.color, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>

      {/* odds */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 52 }}>
        <div className="mono tnum" style={{ fontSize: 19, fontWeight: 700, color: CF.gold, letterSpacing: -0.4 }}>{s.oddsX.toFixed(1)}×</div>
        <div className="mono" style={{ fontSize: 9, color: CF.ink4, marginTop: 1 }}>{winPct}% to win</div>
      </div>

      {/* back */}
      <button onClick={onBack} className="cf-press" style={{
        flexShrink: 0, padding: '10px 16px', borderRadius: CF.radius.md, border: 'none', cursor: 'pointer',
        background: s.color, color: '#0A0806', fontFamily: CF.body, fontWeight: 700, fontSize: 13,
      }}>
        Back
      </button>
    </div>
  )
}
