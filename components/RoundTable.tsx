'use client'

// THE ROUND TABLE — the broadcast set. The five agents are seated around a
// glowing table; whoever holds the floor leans in, lights up ON AIR, and their
// live argument plays on the table with an audio equalizer. Pure CSS/SVG stage
// driven by the real Venice debate + voice (no video gen, fully reliable).

import { AgentAvatar } from './AgentAvatar'
import { PUNDITS, PUNDIT_ROLES } from '../lib/pundits'
import type { AgentRole } from '../lib/calls-data'
import { CF, alpha } from '../lib/theme'

// an animated audio equalizer in the speaker's colour
export function Equalizer({ color, bars = 16, height = 18 }: { color: string; bars?: number; height?: number }) {
  return (
    <div aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2.5, height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 3, height: '100%', borderRadius: 2, background: color,
          transformOrigin: 'bottom', display: 'inline-block',
          animation: `cf-eq ${(0.5 + ((i * 7) % 9) * 0.07).toFixed(2)}s ease-in-out ${(i * 0.045).toFixed(2)}s infinite`,
          boxShadow: `0 0 6px ${alpha(color, 55)}`,
        }} />
      ))}
    </div>
  )
}

// seat positions around an elliptical table (head at the back, two each side/front)
const SEATS: Record<AgentRole, { left: number; top: number; s: number }> = {
  MacroScout: { left: 50, top: 13, s: 0.82 },  // PHOENIX — head of the table
  NewsHawk: { left: 13, top: 42, s: 0.92 },     // ORION — left
  CrowdPulse: { left: 87, top: 42, s: 0.92 },   // NEXUS — right
  BookWatcher: { left: 27, top: 79, s: 1.06 },  // ECHO — front-left
  Skeptic: { left: 73, top: 79, s: 1.06 },      // VEGA — front-right
}

type Speaking = { role: AgentRole; text: string } | null

export function RoundTable({
  speaking, positions, winnerPicks, isWinner, deliberating,
}: {
  speaking: Speaking
  positions: Partial<Record<AgentRole, { vote: string; confidence: number }>>
  winnerPicks: Record<string, { country: string; flag: string }>
  isWinner: boolean
  deliberating: boolean
}) {
  const sp = speaking ? PUNDITS[speaking.role] : null

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16 / 11', maxHeight: 460, minHeight: 340,
      borderRadius: CF.radius.lg, overflow: 'hidden',
      background: `radial-gradient(120% 90% at 50% 18%, ${CF.surface} 0%, ${CF.bg} 78%)`,
      border: `1px solid ${CF.line}`, boxShadow: CF.shadow.card,
    }}>
      {/* ambient glow from whoever is speaking */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: sp ? `radial-gradient(60% 50% at 50% 55%, ${alpha(sp.color, 16)}, transparent 70%)` : 'transparent',
        transition: 'background 400ms ease',
      }} />

      {/* the table surface */}
      <div style={{
        position: 'absolute', left: '50%', top: '53%', transform: 'translate(-50%,-50%)',
        width: '60%', height: '48%', borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 35%, ${CF.surface2} 0%, ${CF.surface} 55%, ${CF.bg} 100%)`,
        border: `1px solid ${alpha(sp?.color ?? CF.gold, 30)}`,
        boxShadow: `inset 0 2px 30px rgba(0,0,0,0.55), 0 0 40px ${alpha(sp?.color ?? CF.gold, 12)}`,
        transition: 'border-color 400ms ease, box-shadow 400ms ease',
      }} />

      {/* centre of the table — the live argument / status */}
      <div style={{
        position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)',
        width: '52%', maxWidth: 520, textAlign: 'center', zIndex: 4,
      }}>
        {speaking && sp ? (
          <div className="cf-rise" style={{
            background: alpha(CF.bg, 82), backdropFilter: 'blur(3px)',
            border: `1px solid ${alpha(sp.color, 45)}`, borderRadius: CF.radius.lg,
            padding: '12px 14px', boxShadow: `0 8px 28px rgba(0,0,0,0.45)`,
          }}>
            <div className="mono" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 7, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: sp.color }}>
              <span className="cf-live-dot" style={{ width: 6, height: 6 }} aria-hidden /> {sp.handle} · ON AIR
              <Equalizer color={sp.color} bars={14} height={14} />
            </div>
            <div style={{ fontFamily: CF.body, fontSize: 13.5, color: CF.ink, lineHeight: 1.45 }}>
              “{speaking.text}”
            </div>
          </div>
        ) : deliberating ? (
          <div className="mono" style={{ fontSize: 11.5, letterSpacing: 1, color: CF.ink3, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="cf-live-dot" aria-hidden /> THE PANEL IS DELIBERATING…
          </div>
        ) : (
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.6, color: CF.ink4 }}>
            ▸ OPEN THE FLOOR TO BEGIN
          </div>
        )}
      </div>

      {/* the seats */}
      {PUNDIT_ROLES.map((role) => {
        const p = PUNDITS[role]
        const seat = SEATS[role]
        const isLive = speaking?.role === role
        const dim = !!speaking && !isLive
        const pos = positions[role]
        const vColor = pos?.vote === 'YES' ? CF.bull : pos?.vote === 'NO' ? CF.bear : CF.ink3
        const pick = winnerPicks[role]
        return (
          <div key={role} style={{
            position: 'absolute', left: `${seat.left}%`, top: `${seat.top}%`,
            transform: `translate(-50%,-50%) scale(${isLive ? seat.s * 1.16 : seat.s})${isLive ? ' translateY(-4px)' : ''}`,
            transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease',
            opacity: dim ? 0.62 : 1, zIndex: isLive ? 6 : 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 92,
          }}>
            {isLive ? (
              <span className="mono" style={{
                position: 'absolute', top: -12, fontSize: 7.5, fontWeight: 800, letterSpacing: 0.6, color: '#fff',
                background: CF.bear, padding: '2px 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
              }}>
                <span className="cf-live-dot" style={{ width: 5, height: 5 }} aria-hidden /> ON AIR
              </span>
            ) : null}
            <span style={{
              borderRadius: 12, display: 'inline-flex', overflow: 'hidden',
              border: `2px solid ${p.color}`,
              boxShadow: isLive ? `0 0 0 3px ${alpha(p.color, 40)}, 0 0 26px ${alpha(p.color, 90)}` : `0 0 12px ${alpha(p.color, 30)}`,
              animation: isLive ? 'cf-breathe 1.5s ease-in-out infinite' : undefined,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.portrait} alt={p.handle} loading="lazy" style={{ width: 56, height: 56, objectFit: 'cover', objectPosition: 'center 16%', display: 'block' }} />
            </span>
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 11, color: CF.ink, letterSpacing: 0.3 }}>{p.handle}</span>
            {isWinner && pick ? (
              <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: p.color, padding: '1px 6px', borderRadius: 999, background: alpha(p.color, 14), display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span>{pick.flag}</span>{pick.country}
              </span>
            ) : pos ? (
              <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: vColor, padding: '1px 6px', borderRadius: 999, background: alpha(vColor, 14) }}>{pos.vote} {Math.round(pos.confidence * 100)}%</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
