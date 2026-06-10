// /leaderboard — per-role calibration (editorial-light, Phase 8.11).

import Link from 'next/link'
import { loadCalls } from '../../lib/calls-data'
import { computeAgentStats, rankAgents, councilBrier } from '../../lib/leaderboard'
import { getResolution } from '../../lib/resolutions'
import { ConnectButton } from '../../components/ConnectButton'
import { BrandLogo } from '../../components/Logo'
import { PUNDITS, slugOf } from '../../lib/pundits'
import { CF, alpha } from '../../lib/theme'

export const dynamic = 'force-dynamic'

function brierBadge(brier: number, resolved: number) {
  if (resolved === 0) return { color: CF.ink3, bg: CF.surface2, label: 'unscored' }
  if (brier < 0.10) return { color: CF.bull, bg: CF.bullTint, label: 'sharp' }
  if (brier < 0.20) return { color: CF.bullInk, bg: CF.bullTint, label: 'calibrated' }
  if (brier < 0.25) return { color: CF.amber, bg: CF.amberTint, label: 'fair' }
  return { color: CF.bear, bg: CF.bearTint, label: 'miscalibrated' }
}

export default function Leaderboard() {
  const calls = loadCalls()
  const stats = computeAgentStats(calls)
  const ranked = rankAgents(stats)
  const council = councilBrier(stats)
  const resolvedCalls = calls.filter((c) => getResolution(c.marketId) !== 'PENDING')
  const openCalls = calls.length - resolvedCalls.length

  return (
    <main style={{
      background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px',
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* nav */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={26} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>
              CROSSFIRE
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/" style={{
              padding: '8px 12px', borderRadius: CF.radius.md,
              fontFamily: CF.body, fontSize: 13, color: CF.ink2, fontWeight: 500,
            }}>
              ← all calls
            </Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* title */}
        <section style={{ padding: '48px 0 28px' }}>
          <div className="mono" style={{
            fontSize: 11, color: CF.ink3, letterSpacing: 2.2, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
            THE STANDINGS
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 500,
            fontSize: 'clamp(40px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: -1.8,
            margin: '0 0 16px', color: CF.ink,
            fontVariationSettings: '"opsz" 120',
          }}>
            Who&apos;s calling it best
          </h1>
          <p style={{
            fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.6, maxWidth: 720, margin: 0,
          }}>
            The five agents, ranked by how accurate they&apos;ve actually been —
            <span style={{ color: CF.ink }}> backtested on real, already-played matches</span> (2018–2024
            World Cups, Euros, Copa América). The 2026 markets haven&apos;t been played, so
            they stay open. The score is a Brier — lower is better; 0 is perfect, 0.25 a
            coin flip. A sharper record earns a bigger budget on the next call
            (<span style={{ color: CF.ink }}>budget ×</span>), so being right compounds.
          </p>
        </section>

        {/* summary tiles */}
        <section className="cf-g4" style={{ gap: 12, marginBottom: 24 }}>
          {[
            { label: 'CALLS PUBLISHED', value: calls.length.toString(), color: CF.ink },
            { label: 'RESOLVED', value: resolvedCalls.length.toString(), color: CF.ink },
            { label: 'OPEN', value: openCalls.toString(), color: CF.ink },
            {
              label: 'LEAGUE BRIER',
              value: council > 0 ? council.toFixed(3) : '—',
              color: council > 0 && council < 0.2 ? CF.bull : CF.ink,
            },
          ].map((t) => (
            <div key={t.label} style={{
              padding: '16px 18px', background: CF.surface,
              border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg,
              boxShadow: CF.shadow.card,
            }}>
              <div className="mono" style={{ fontSize: 10, color: CF.ink4, letterSpacing: 1.5, marginBottom: 8 }}>
                {t.label}
              </div>
              <div className="mono tnum" style={{
                fontSize: 26, fontWeight: 600, color: t.color, letterSpacing: -0.4,
              }}>
                {t.value}
              </div>
            </div>
          ))}
        </section>

        {/* table — wide grid scrolls inside the card on small screens */}
        <section className="cf-scroll-x" style={{
          background: CF.surface, border: `1px solid ${CF.line}`,
          borderRadius: CF.radius.lg, boxShadow: CF.shadow.card,
        }}>
          <div className="mono" style={{
            display: 'grid', gridTemplateColumns: '36px 1.5fr 64px 64px 80px 84px 110px',
            gap: 12, alignItems: 'center',
            padding: '12px 20px',
            background: CF.surface2,
            fontSize: 10, color: CF.ink3, letterSpacing: 1.5, fontWeight: 600,
            borderBottom: `1px solid ${CF.line}`,
          }}>
            <div>#</div>
            <div>AGENT</div>
            <div style={{ textAlign: 'right' }}>CALLS</div>
            <div style={{ textAlign: 'right' }}>WIN %</div>
            <div style={{ textAlign: 'right' }}>BRIER</div>
            <div style={{ textAlign: 'right' }} title="Reputation → budget: bond share scales with calibration">BUDGET ×</div>
            <div style={{ textAlign: 'right' }}>RATING</div>
          </div>

          {ranked.map((s, i) => {
            const badge = brierBadge(s.brierScore, s.callsResolved)
            const winColor = s.winRate >= 0.66 ? CF.bull : s.winRate >= 0.34 ? CF.amber : CF.bear
            return (
              <div key={s.role} style={{
                display: 'grid', gridTemplateColumns: '36px 1.5fr 64px 64px 80px 84px 110px',
                gap: 12, alignItems: 'center', padding: '18px 20px',
                borderBottom: i < ranked.length - 1 ? `1px solid ${CF.line}` : 'none',
              }}>
                <div className="mono tnum" style={{
                  fontSize: 14, fontWeight: 600,
                  color: i === 0 ? CF.bull : i === 1 ? CF.amber : CF.ink3,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <Link href={`/agents/${slugOf(s.role)}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{
                    display: 'inline-flex', overflow: 'hidden', flexShrink: 0,
                    width: 38, height: 38, borderRadius: 9,
                    border: `1.5px solid ${PUNDITS[s.role]?.color ?? badge.color}`,
                    boxShadow: `0 0 10px ${alpha(PUNDITS[s.role]?.color ?? badge.color, 35)}`,
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={PUNDITS[s.role]?.portrait} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 16%' }} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 14, letterSpacing: 0.3, color: PUNDITS[s.role]?.color ?? CF.ink }}>
                        {PUNDITS[s.role]?.handle ?? s.role}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: CF.ink4 }}>
                        {PUNDITS[s.role]?.archetype}
                      </span>
                    </div>
                    {/* per-category calibration chips */}
                    <div className="mono" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                      {Object.entries(s.byCategory).length === 0 ? (
                        <span style={{ fontSize: 10.5, color: CF.ink4 }}>{PUNDITS[s.role]?.desk}</span>
                      ) : (
                        Object.entries(s.byCategory)
                          .sort((a, b) => a[1].brier - b[1].brier)
                          .map(([cat, c]) => {
                            const col = c.brier < 0.15 ? CF.bull : c.brier < 0.25 ? CF.amber : CF.bear
                            return (
                              <span key={cat} title={`${cat}: ${c.won}/${c.resolved} right · Brier ${c.brier.toFixed(2)}`}
                                style={{ fontSize: 10, color: CF.ink3 }}>
                                {cat} <span className="tnum" style={{ color: col, fontWeight: 600 }}>{c.brier.toFixed(2)}</span>
                              </span>
                            )
                          })
                      )}
                    </div>
                  </div>
                </Link>
                <div className="mono tnum" style={{ fontSize: 13, color: CF.ink, textAlign: 'right' }}>
                  {s.callsResolved}<span style={{ color: CF.ink4 }}>/{s.callsTotal}</span>
                </div>
                <div className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: winColor, textAlign: 'right' }}>
                  {s.callsResolved > 0 ? `${(s.winRate * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="mono tnum" style={{
                  fontSize: 15, fontWeight: 600, color: badge.color, textAlign: 'right',
                }}>
                  {s.callsResolved > 0 ? s.brierScore.toFixed(3) : '—'}
                </div>
                <div className="mono tnum" style={{
                  fontSize: 14, fontWeight: 600, textAlign: 'right',
                  color: s.budgetMultiplier > 1 ? CF.bull : s.budgetMultiplier < 1 ? CF.bear : CF.ink2,
                }}>
                  {s.budgetMultiplier.toFixed(2)}×
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{
                    display: 'inline-block', padding: '4px 10px', borderRadius: 999,
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${alpha(badge.color, 20)}`,
                    fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
                  }}>{badge.label}</span>
                </div>
              </div>
            )
          })}
        </section>

        {/* methodology */}
        <section style={{
          marginTop: 28, padding: '20px 24px',
          background: CF.surface2, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg,
          fontFamily: CF.body, fontSize: 13.5, color: CF.ink2, lineHeight: 1.6,
        }}>
          <div className="mono" style={{
            fontSize: 10.5, color: CF.ink3, letterSpacing: 1.5, marginBottom: 8,
          }}>
            THE ACCOUNTABILITY LOOP
          </div>
          <p style={{ margin: '0 0 8px' }}>
            Brier is the mean squared error of an agent's probability forecasts —
            confidence when it votes YES, <span style={{ color: CF.ink, fontWeight: 600 }}>1 − confidence</span> when it votes NO,
            squared against the actual outcome. Lower is better (0 perfect,
            0.25 a coin flip). The chips under each agent show its calibration
            per domain, so you can see who's sharp on macro vs sports.
          </p>
          <p style={{ margin: 0 }}>
            <span style={{ color: CF.ink, fontWeight: 600 }}>That track record feeds back into the stake.</span> Each agent's Brier
            sets a <span className="mono">budget ×</span> multiplier (sharp 1.5× → calibrated 1.2× →
            fair 1.0× → miscalibrated 0.7×). When the council publishes a call,
            the on-chain bond is scaled by the multipliers of the agents who
            backed it — agents that have been right literally stake more, and
            ones that have been wrong stake less. Being calibrated earns
            conviction; being wrong costs it.
          </p>
        </section>
      </div>
    </main>
  )
}
