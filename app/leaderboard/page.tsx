// /leaderboard — per-role calibration (editorial-light, Phase 8.11).

import Link from 'next/link'
import { loadCalls } from '../../lib/calls-data'
import { computeAgentStats, rankAgents, councilBrier } from '../../lib/leaderboard'
import { getResolution } from '../../lib/resolutions'
import { ConnectButton } from '../../components/ConnectButton'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

const AGENT_LETTER: Record<string, string> = {
  MacroScout: 'M', NewsHawk: 'N', CrowdPulse: 'C', BookWatcher: 'B', Skeptic: 'S',
}
const ROLE_TAGLINE: Record<string, string> = {
  MacroScout: 'macro regimes & flows',
  NewsHawk: 'breaking news & catalysts',
  CrowdPulse: 'sentiment & positioning',
  BookWatcher: 'price action & book depth',
  Skeptic: 'adversarial refutation',
}

function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      <line x1="18" y1="18" x2="82" y2="82" stroke={CF.bull} strokeWidth="7" strokeLinecap="round" />
      <line x1="82" y1="18" x2="18" y2="82" stroke={CF.bear} strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="5" fill={CF.ink} />
    </svg>
  )
}

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
            <LogoMark size={24} />
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
            COUNCIL CALIBRATION
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 500,
            fontSize: 'clamp(40px, 5vw, 56px)', lineHeight: 1.05, letterSpacing: -1.8,
            margin: '0 0 16px', color: CF.ink,
            fontVariationSettings: '"opsz" 120',
          }}>
            The leaderboard
          </h1>
          <p style={{
            fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.6, maxWidth: 720, margin: 0,
          }}>
            Each agent is scored by Brier — the mean squared error of its
            probability forecasts on resolved markets. Lower is better; 0 is
            perfect, 0.25 is a coin flip. Confidence is already capital at risk
            via the bond, so the leaderboard reflects what these agents would
            have actually earned or lost.
          </p>
        </section>

        {/* summary tiles */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
        }}>
          {[
            { label: 'CALLS PUBLISHED', value: calls.length.toString(), color: CF.ink },
            { label: 'RESOLVED', value: resolvedCalls.length.toString(), color: CF.ink },
            { label: 'OPEN', value: openCalls.toString(), color: CF.ink },
            {
              label: 'COUNCIL BRIER',
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

        {/* table */}
        <section style={{
          background: CF.surface, border: `1px solid ${CF.line}`,
          borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, overflow: 'hidden',
        }}>
          <div className="mono" style={{
            display: 'grid', gridTemplateColumns: '40px 1.5fr 80px 80px 90px 100px 120px',
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
            <div style={{ textAlign: 'right' }}>AVG CONF</div>
            <div style={{ textAlign: 'right' }}>BRIER</div>
            <div style={{ textAlign: 'right' }}>RATING</div>
          </div>

          {ranked.map((s, i) => {
            const badge = brierBadge(s.brierScore, s.callsResolved)
            const winColor = s.winRate >= 0.66 ? CF.bull : s.winRate >= 0.34 ? CF.amber : CF.bear
            return (
              <div key={s.role} style={{
                display: 'grid', gridTemplateColumns: '40px 1.5fr 80px 80px 90px 100px 120px',
                gap: 12, alignItems: 'center', padding: '20px',
                borderBottom: i < ranked.length - 1 ? `1px solid ${CF.line}` : 'none',
              }}>
                <div className="mono tnum" style={{
                  fontSize: 14, fontWeight: 600,
                  color: i === 0 ? CF.bull : i === 1 ? CF.amber : CF.ink3,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: CF.radius.md,
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.color}33`,
                    fontFamily: CF.mono, fontSize: 13, fontWeight: 700,
                  }}>{AGENT_LETTER[s.role] ?? '?'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: CF.body, fontWeight: 600, fontSize: 14, color: CF.ink }}>
                      {s.role}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 2 }}>
                      {ROLE_TAGLINE[s.role]} · {(s.agreementRate * 100).toFixed(0)}% with council
                    </div>
                  </div>
                </div>
                <div className="mono tnum" style={{ fontSize: 13, color: CF.ink, textAlign: 'right' }}>
                  {s.callsResolved}<span style={{ color: CF.ink4 }}>/{s.callsTotal}</span>
                </div>
                <div className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: winColor, textAlign: 'right' }}>
                  {s.callsResolved > 0 ? `${(s.winRate * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="mono tnum" style={{ fontSize: 13, color: CF.ink2, textAlign: 'right' }}>
                  {(s.avgConfidence * 100).toFixed(0)}%
                </div>
                <div className="mono tnum" style={{
                  fontSize: 15, fontWeight: 600, color: badge.color, textAlign: 'right',
                }}>
                  {s.callsResolved > 0 ? s.brierScore.toFixed(3) : '—'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{
                    display: 'inline-block', padding: '4px 10px', borderRadius: 999,
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.color}33`,
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
            METHODOLOGY
          </div>
          <p style={{ margin: '0 0 8px' }}>
            For each call we read the agent's predicted probability of YES —
            equal to confidence when they vote YES, <span style={{ color: CF.ink, fontWeight: 600 }}>1 − confidence</span> when they
            vote NO, and 0.5 on abstain. Squared error against the actual
            outcome gives the call's Brier; the agent's score is the mean over
            their resolved calls.
          </p>
          <p style={{ margin: 0 }}>
            Win rate counts how often the agent's literal vote matched the
            resolved outcome — a blunter but easier-to-read measure. Both
            metrics ignore pending markets.
          </p>
        </section>
      </div>
    </main>
  )
}
