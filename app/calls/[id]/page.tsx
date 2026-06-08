// /calls/[id] — per-call detail page (editorial-light, Phase 8.11).

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCallByIdWithPolymarket, relativeTime } from '../../../lib/calls-data'
import { ConnectButton } from '../../../components/ConnectButton'
import { UnlockThesis } from '../../../components/UnlockThesis'
import { FadeFollow } from '../../../components/FadeFollow'
import { BrandLogo } from '../../../components/Logo'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { CF, alpha } from '../../../lib/theme'

export const dynamic = 'force-dynamic'

const AGENT_LETTER: Record<string, string> = {
  MacroScout: 'M', NewsHawk: 'N', CrowdPulse: 'C', BookWatcher: 'B', Skeptic: 'S',
}

export default async function CallDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const call = await getCallByIdWithPolymarket(id)
  if (!call) notFound()

  const isYes = call.side === 'YES'
  const sideColor = isYes ? CF.bull : CF.bear
  const sideTint = isYes ? CF.bullTint : CF.bearTint
  const sideInk = isYes ? CF.bullInk : CF.bearInk
  const selectedPct = Math.round(call.selectedSideProb * 100)

  // Single source of truth for the "market line": prefer the live Polymarket
  // price (the same reference the feed card shows) over the un-seeded on-chain
  // 50% implied. Edge is recomputed against whichever line we display, so the
  // header never contradicts the card. (QA ISSUE-002)
  const hasLive = !!call.livePolymarket
  const marketYes = hasLive ? call.livePolymarket!.yes : call.marketImpliedYes
  const marketPct = Math.round(marketYes * 100)
  const marketSideProb = isYes ? marketYes : 1 - marketYes
  const edgePts = Math.round((call.selectedSideProb - marketSideProb) * 100)
  const marketRef = hasLive ? 'Polymarket live' : 'on-chain implied'

  const roleVotes = call.votes.filter((v) => v.role !== 'Skeptic')
  const skepticVote = call.votes.find((v) => v.role === 'Skeptic')
  const agreed = roleVotes.filter((v) => v.vote === call.side).length

  return (
    <main style={{
      background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* ── nav ── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={26} />
            <span style={{
              fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink,
            }}>
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
            <ThemeToggle />
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* ── editorial masthead ── */}
        <section style={{ padding: '48px 0 32px' }}>
          <div className="mono" style={{
            fontSize: 11, color: CF.ink3, letterSpacing: 2.2, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
            AGENT CALL · {call.publishedBy.toUpperCase()} · {relativeTime(call.publishedAt).toUpperCase()}
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 500,
            fontSize: 'clamp(36px, 5vw, 52px)', lineHeight: 1.08, letterSpacing: -1.6,
            margin: '0 0 28px', color: CF.ink,
            fontVariationSettings: '"opsz" 120',
          }}>
            {call.marketTitle}
          </h1>

          {/* ── numbers card ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center',
            padding: '24px 28px',
            background: CF.surface, border: `1px solid ${CF.line}`,
            borderRadius: CF.radius.lg, boxShadow: CF.shadow.card,
          }}>
            {/* big P(side) */}
            <div>
              <div className="mono" style={{
                fontSize: 10.5, color: CF.ink4, letterSpacing: 1.4, marginBottom: 6,
              }}>
                CHANCE OF {call.side}
              </div>
              <div className="mono tnum" style={{
                fontSize: 56, fontWeight: 600, color: sideColor,
                letterSpacing: -2, lineHeight: 1,
              }}>
                {selectedPct}<span style={{ fontSize: 24, color: CF.ink3, fontWeight: 400 }}>%</span>
              </div>
            </div>
            {/* edge */}
            <div style={{ borderLeft: `1px solid ${CF.line}`, paddingLeft: 28 }}>
              <div className="mono" style={{
                fontSize: 10.5, color: CF.ink4, letterSpacing: 1.4, marginBottom: 6,
              }}>
VS {hasLive ? 'POLYMARKET' : 'THE MARKET'}
              </div>
              <div className="mono tnum" style={{
                fontSize: 26, fontWeight: 600, color: edgePts > 0 ? sideColor : CF.ink3,
              }}>
                {edgePts > 0 ? '+' : ''}{edgePts}<span style={{ fontSize: 14, color: CF.ink3, fontWeight: 400 }}>pts</span>
              </div>
              <div className="mono tnum" style={{ fontSize: 11.5, color: CF.ink3, marginTop: 6 }}>
agents {selectedPct}% {call.side} · {marketRef} {marketPct}% YES
              </div>
            </div>
            {/* bond */}
            <div style={{ textAlign: 'right', borderLeft: `1px solid ${CF.line}`, paddingLeft: 28 }}>
              <div className="mono" style={{
                fontSize: 10.5, color: CF.ink4, letterSpacing: 1.4, marginBottom: 6,
              }}>
BACKED WITH
              </div>
              <div className="mono tnum" style={{
                fontSize: 26, fontWeight: 600, color: CF.ink,
              }}>
                {call.bondUsdc.toFixed(2)} <span style={{ fontSize: 14, color: CF.ink3, fontWeight: 400 }}>USDC</span>
              </div>
              {call.bondTxHash ? (
                <a href={`https://sepolia.basescan.org/tx/${call.bondTxHash}`} target="_blank" rel="noreferrer" className="mono" style={{
                  fontSize: 11, color: CF.gold, marginTop: 6, display: 'block', fontWeight: 600,
                }}>
                  on-chain ✓ {call.bondTxHash.slice(0, 10)}…↗
                </a>
              ) : (
                <div className="mono" style={{ fontSize: 11, color: CF.ink4, marginTop: 6 }}>not on-chain yet</div>
              )}
            </div>
          </div>

          <div className="mono" style={{
            fontSize: 11.5, color: CF.ink2, marginTop: 14,
            display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span style={{
              padding: '3px 9px', borderRadius: CF.radius.sm,
              background: sideTint, color: sideInk,
              fontFamily: CF.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: 1,
            }}>
              BUY {call.side}
            </span>
            <span>Market: <a href={`https://sepolia.basescan.org/address/${call.marketAddress}`} target="_blank" rel="noreferrer" style={{ color: CF.ink2 }}>
              {call.marketAddress.slice(0, 10)}…{call.marketAddress.slice(-4)} ↗
            </a></span>
          </div>
        </section>

        {/* ── COUNCIL VOTES ── */}
        <section style={{ padding: '8px 0 24px' }}>
          <div className="mono" style={{
            fontSize: 11, color: CF.ink3, letterSpacing: 2.2, marginBottom: 14,
          }}>
            COUNCIL VOTES · {agreed}/{roleVotes.length} AGREED
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {call.votes.map((v) => {
              const isSkeptic = v.role === 'Skeptic'
              const vColor = isSkeptic
                ? (call.skepticVerdict === 'APPROVED' ? CF.bull : CF.bear)
                : v.vote === call.side ? sideColor
                  : v.vote === 'NEUTRAL' ? CF.amber : CF.ink3
              const vTint = isSkeptic
                ? (call.skepticVerdict === 'APPROVED' ? CF.bullTint : CF.bearTint)
                : v.vote === call.side ? sideTint
                  : v.vote === 'NEUTRAL' ? CF.amberTint : CF.surface2
              return (
                <div key={v.role} style={{
                  padding: '14px 16px',
                  background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg,
                  boxShadow: CF.shadow.card,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: CF.radius.sm,
                        background: vTint, color: vColor, border: `1px solid ${alpha(vColor, 20)}`,
                        fontFamily: CF.mono, fontSize: 11, fontWeight: 700,
                      }}>{AGENT_LETTER[v.role] ?? '?'}</span>
                      <span style={{
                        fontFamily: CF.body, fontWeight: 600, color: CF.ink, fontSize: 14,
                      }}>{v.role}</span>
                    </div>
                    <div className="mono tnum" style={{ fontSize: 12 }}>
                      <span style={{ color: vColor, fontWeight: 600 }}>{v.vote}</span>
                      <span style={{ color: CF.ink3 }}>  ·  {(v.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: CF.body, fontSize: 13.5, color: CF.ink2, lineHeight: 1.55,
                  }}>
                    {v.oneLiner}
                  </div>
                </div>
              )
            })}
          </div>
          {skepticVote ? (
            <div className="mono" style={{
              marginTop: 12, padding: '10px 16px',
              background: call.skepticVerdict === 'APPROVED' ? CF.bullTint : CF.bearTint,
              border: `1px solid ${alpha(call.skepticVerdict === 'APPROVED' ? CF.bull : CF.bear, 25)}`,
              borderRadius: CF.radius.md,
              fontSize: 11.5, fontWeight: 600,
              color: call.skepticVerdict === 'APPROVED' ? CF.bullInk : CF.bearInk,
              letterSpacing: 0.6,
            }}>
              SKEPTIC {call.skepticVerdict} AT {(skepticVote.confidence * 100).toFixed(0)}% REFUTATION CONFIDENCE
            </div>
          ) : null}
        </section>

        {/* ── fade or follow: the staked call + your capped bet (ERC-7715) ── */}
        <section style={{ padding: '12px 0' }}>
          <FadeFollow call={call} />
        </section>

        {/* ── unlock ── */}
        <section style={{ padding: '12px 0' }}>
          <UnlockThesis call={call} />
        </section>
      </div>
    </main>
  )
}
