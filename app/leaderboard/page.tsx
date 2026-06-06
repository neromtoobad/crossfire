// /leaderboard — per-role calibration table.
//
// Brier ascending (lower = better). Shows calls resolved, win rate,
// avg confidence, and council-wide average at the bottom.

import Link from 'next/link'
import { loadCalls } from '../../lib/calls-data'
import { computeAgentStats, rankAgents, councilBrier } from '../../lib/leaderboard'
import { getResolution } from '../../lib/resolutions'
import { ConnectButton } from '../../components/ConnectButton'

export const dynamic = 'force-dynamic'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45', white: '#ffffff',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

const AGENT_LETTER: Record<string, string> = {
  MacroScout: 'M',
  NewsHawk: 'N',
  CrowdPulse: 'C',
  BookWatcher: 'B',
  Skeptic: 'S',
}

const ROLE_TAGLINE: Record<string, string> = {
  MacroScout: 'macro regimes & flows',
  NewsHawk: 'breaking news & catalysts',
  CrowdPulse: 'sentiment & positioning',
  BookWatcher: 'price action & book depth',
  Skeptic: 'adversarial refutation',
}

function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <line x1="16" y1="16" x2="84" y2="84" stroke={CF.bull} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${CF.bull})`, opacity: 0.9 }} />
      <line x1="84" y1="16" x2="16" y2="84" stroke={CF.bear} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${CF.bear})`, opacity: 0.9 }} />
      <circle cx="50" cy="50" r="6" fill="#fff" style={{ filter: `drop-shadow(0 0 8px #fff)` }} />
    </svg>
  )
}

function brierBadge(brier: number, resolved: number) {
  if (resolved === 0) {
    return { color: CF.dim, label: 'unscored' }
  }
  if (brier < 0.10) return { color: CF.bull, label: 'sharp' }
  if (brier < 0.20) return { color: CF.bull, label: 'calibrated' }
  if (brier < 0.25) return { color: CF.amber, label: 'fair' }
  return { color: CF.bear, label: 'miscalibrated' }
}

export default function Leaderboard() {
  const calls = loadCalls()
  const stats = computeAgentStats(calls)
  const ranked = rankAgents(stats)
  const council = councilBrier(stats)

  const resolvedCalls = calls.filter((c) => getResolution(c.marketId) !== 'PENDING')
  const openCalls = calls.length - resolvedCalls.length

  return (
    <main style={{ background: CF.bg, color: CF.text, minHeight: '100vh', padding: '0 32px 60px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* ── nav ─────────────────────────────────────────────────────── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0', borderBottom: `1px solid ${CF.edge}`,
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <LogoMark size={26} />
            <span style={{ fontFamily: CF.display, fontWeight: 700, fontSize: 16, letterSpacing: 3.4, color: CF.text }}>
              CROSSFIRE
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/" style={{
              padding: '8px 14px', borderRadius: 7, textDecoration: 'none',
              fontFamily: CF.mono, fontSize: 12, color: CF.dim,
              border: `1px solid ${CF.edge}`,
            }}>
              ← all calls
            </Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* ── title ───────────────────────────────────────────────────── */}
        <section style={{ padding: '36px 0 22px' }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 2, marginBottom: 10 }}>
            COUNCIL CALIBRATION
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 34, lineHeight: 1.15,
            letterSpacing: -0.5, margin: '0 0 14px', color: CF.text,
          }}>
            Leaderboard
          </h1>
          <p style={{
            fontFamily: CF.display, fontSize: 14.5, color: CF.dim, lineHeight: 1.55, maxWidth: 660, margin: 0,
          }}>
            Each agent is scored by Brier — the mean squared error of its probability forecasts on
            resolved markets. Lower is better; 0 is perfect, 0.25 is a coin flip. Confidence is
            already capital at risk via the bond, so the leaderboard reflects what these agents would
            have actually earned or lost.
          </p>
        </section>

        {/* ── summary tiles ───────────────────────────────────────────── */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22,
        }}>
          {[
            { label: 'CALLS PUBLISHED', value: calls.length.toString() },
            { label: 'RESOLVED', value: resolvedCalls.length.toString() },
            { label: 'OPEN', value: openCalls.toString() },
            {
              label: 'COUNCIL BRIER',
              value: council > 0 ? council.toFixed(3) : '—',
              color: council > 0 && council < 0.2 ? CF.bull : CF.text,
            },
          ].map((t) => (
            <div key={t.label} style={{
              padding: '14px 16px', background: CF.panel, border: `1px solid ${CF.edge}`,
              borderRadius: 10,
            }}>
              <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dim, letterSpacing: 1.5, marginBottom: 6 }}>
                {t.label}
              </div>
              <div style={{
                fontFamily: CF.mono, fontSize: 22, fontWeight: 600,
                color: t.color ?? CF.text, letterSpacing: -0.3,
              }}>
                {t.value}
              </div>
            </div>
          ))}
        </section>

        {/* ── ranked table ────────────────────────────────────────────── */}
        <section>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1.4fr 80px 80px 90px 100px 110px',
            gap: 12, alignItems: 'center', padding: '10px 16px',
            fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.5,
            borderBottom: `1px solid ${CF.edge}`,
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
                display: 'grid',
                gridTemplateColumns: '36px 1.4fr 80px 80px 90px 100px 110px',
                gap: 12, alignItems: 'center', padding: '16px',
                background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 10,
                marginTop: 10,
              }}>
                {/* rank */}
                <div style={{
                  fontFamily: CF.mono, fontSize: 14, fontWeight: 600,
                  color: i === 0 ? CF.bull : i === 1 ? CF.amber : CF.dim,
                }}>
                  {i + 1}
                </div>
                {/* agent */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 7,
                    background: `color-mix(in oklab, ${badge.color} 16%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${badge.color} 50%, transparent)`,
                    color: badge.color, fontFamily: CF.mono, fontSize: 13, fontWeight: 700,
                  }}>{AGENT_LETTER[s.role] ?? '?'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: CF.display, fontWeight: 600, fontSize: 14, color: CF.text }}>
                      {s.role}
                    </div>
                    <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim }}>
                      {ROLE_TAGLINE[s.role]} · {(s.agreementRate * 100).toFixed(0)}% with council
                    </div>
                  </div>
                </div>
                {/* calls */}
                <div style={{ fontFamily: CF.mono, fontSize: 13, color: CF.text, textAlign: 'right' }}>
                  {s.callsResolved}<span style={{ color: CF.dimmer }}>/{s.callsTotal}</span>
                </div>
                {/* win rate */}
                <div style={{ fontFamily: CF.mono, fontSize: 13, fontWeight: 600, color: winColor, textAlign: 'right' }}>
                  {s.callsResolved > 0 ? `${(s.winRate * 100).toFixed(0)}%` : '—'}
                </div>
                {/* avg conf */}
                <div style={{ fontFamily: CF.mono, fontSize: 13, color: CF.dim, textAlign: 'right' }}>
                  {(s.avgConfidence * 100).toFixed(0)}%
                </div>
                {/* brier */}
                <div style={{
                  fontFamily: CF.mono, fontSize: 15, fontWeight: 600,
                  color: badge.color, textAlign: 'right',
                }}>
                  {s.callsResolved > 0 ? s.brierScore.toFixed(3) : '—'}
                </div>
                {/* rating */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 9px', borderRadius: 999,
                    background: `color-mix(in oklab, ${badge.color} 14%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${badge.color} 50%, transparent)`,
                    color: badge.color, fontFamily: CF.mono, fontSize: 10.5,
                    fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
                  }}>{badge.label}</span>
                </div>
              </div>
            )
          })}
        </section>

        {/* ── methodology footer ──────────────────────────────────────── */}
        <section style={{
          marginTop: 28, padding: '18px 20px',
          background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 10,
          fontFamily: CF.display, fontSize: 13, color: CF.dim, lineHeight: 1.6,
        }}>
          <div style={{
            fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.5, marginBottom: 8,
          }}>
            METHODOLOGY
          </div>
          <p style={{ margin: '0 0 8px' }}>
            For each call we read the agent's predicted probability of YES — equal to confidence
            when they vote YES, <span style={{ color: CF.text }}>1 − confidence</span> when they
            vote NO, and 0.5 on abstain. Squared error against the actual outcome gives the call's
            Brier; the agent's score is the mean over their resolved calls.
          </p>
          <p style={{ margin: 0 }}>
            Win rate counts how often the agent's literal vote matched the resolved outcome — a
            blunter but easier-to-read measure. Both metrics ignore pending markets.
          </p>
        </section>
      </div>
    </main>
  )
}
