// THE LEAGUE — the five forecasters as a roster of character cards. Server
// component: takes the calls, computes each pundit's record, renders the panel.
// This is the heart of the new identity — the personalities, front and centre.

import Link from 'next/link'
import { PUNDITS, PUNDIT_ROLES } from '../lib/pundits'
import { computeAgentStats } from '../lib/leaderboard'
import type { PublishedCall } from '../lib/calls-data'
import { CF, alpha } from '../lib/theme'

export function PunditsRoster({ calls }: { calls: PublishedCall[] }) {
  const stats = computeAgentStats(calls)
  const byRole = new Map(stats.map((s) => [s.role, s]))

  return (
    <section style={{ padding: '26px 0', borderBottom: `1px solid ${CF.line}` }}>
      <div className="mono" style={{
        fontSize: 11, letterSpacing: 2.2, color: CF.ink3, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
        THE AGENTS · LIVE STANDINGS
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {PUNDIT_ROLES.map((role) => {
          const p = PUNDITS[role]
          const s = byRole.get(role)
          const resolved = s?.callsResolved ?? 0
          const winPct = resolved > 0 ? Math.round((s!.winRate) * 100) : null
          const calls = s?.callsTotal ?? 0
          const mult = s?.budgetMultiplier ?? 1
          return (
            <Link
              key={role}
              href="/leaderboard"
              style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: '16px 16px 14px',
                background: CF.surface, border: `1px solid ${CF.line}`,
                borderTop: `3px solid ${p.color}`,
                borderRadius: CF.radius.lg, boxShadow: CF.shadow.card,
              }}
            >
              {/* avatar + handle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 38, height: 38, borderRadius: 999, flexShrink: 0,
                  background: p.tint, border: `1px solid ${alpha(p.color, 25)}`,
                  fontSize: 20, lineHeight: 1,
                }}>{p.avatar}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: CF.body, fontWeight: 700, fontSize: 15, letterSpacing: 0.4, color: p.color,
                  }}>{p.handle}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: CF.ink3, letterSpacing: 0.3 }}>
                    {p.archetype}
                  </div>
                </div>
              </div>

              {/* blurb */}
              <div style={{
                fontFamily: CF.body, fontSize: 12.5, color: CF.ink2, lineHeight: 1.45, flex: 1,
              }}>
                {p.blurb}
              </div>

              {/* record */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 10, borderTop: `1px solid ${CF.line}`,
              }}>
                <span className="mono tnum" style={{ fontSize: 11, color: CF.ink2 }}>
                  {winPct !== null
                    ? <><span style={{ color: winPct >= 50 ? CF.positive : CF.ink2, fontWeight: 600 }}>{winPct}%</span> right · {calls} calls</>
                    : <>{calls} calls · <span style={{ color: CF.ink4 }}>new</span></>}
                </span>
                <span className="mono" style={{
                  fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                  background: mult >= 1.2 ? CF.bullTint : mult < 1 ? CF.bearTint : CF.surface2,
                  color: mult >= 1.2 ? CF.bullInk : mult < 1 ? CF.bearInk : CF.ink3,
                }}>
                  {mult.toFixed(1)}×
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
