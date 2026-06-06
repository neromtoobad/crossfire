// /calls/[id] — per-call detail page.
// Public: market title, side, percentages, agent votes, Skeptic verdict, bond.
// Locked behind x402 micropayment: full thesis + evidence trail + counterarguments.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCallById, relativeTime } from '../../../lib/calls-data'
import { ConnectButton } from '../../../components/ConnectButton'
import { UnlockThesis } from '../../../components/UnlockThesis'

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

export default async function CallDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const call = getCallById(id)
  if (!call) notFound()

  const sideColor = call.side === 'YES' ? CF.bull : CF.bear
  const selectedPct = Math.round(call.selectedSideProb * 100)
  const marketPct = Math.round(call.marketImpliedYes * 100)
  const edgePts = Math.round(call.edge * 100)

  const roleVotes = call.votes.filter((v) => v.role !== 'Skeptic')
  const skepticVote = call.votes.find((v) => v.role === 'Skeptic')
  const agreed = roleVotes.filter((v) => v.vote === call.side).length

  return (
    <main style={{ background: CF.bg, color: CF.text, minHeight: '100vh', padding: '0 32px 60px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
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

        {/* ── header card: title + side + numbers ─────────────────────── */}
        <section style={{ padding: '36px 0 16px' }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 2, marginBottom: 10 }}>
            BONDED CALL · {call.publishedBy} · {relativeTime(call.publishedAt)}
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 32, lineHeight: 1.18,
            letterSpacing: -0.5, margin: '0 0 26px', color: CF.text,
          }}>
            {call.marketTitle}
          </h1>

          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center',
            padding: '20px 24px', background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
          }}>
            {/* big P(side) */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: -24, top: 0, bottom: 0, width: 2.5,
                background: sideColor, boxShadow: `0 0 10px ${sideColor}`,
              }} />
              <div style={{
                fontFamily: CF.mono, fontSize: 44, fontWeight: 600, color: sideColor,
                letterSpacing: -1.5, lineHeight: 1,
              }}>
                {selectedPct}<span style={{ fontSize: 22, color: CF.dim }}>%</span>
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 4, letterSpacing: 1 }}>
                P({call.side})
              </div>
            </div>
            {/* edge */}
            <div>
              <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.5, marginBottom: 6 }}>
                EDGE OVER MARKET
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 22, fontWeight: 600, color: edgePts > 0 ? sideColor : CF.dim }}>
                {edgePts > 0 ? '+' : ''}{edgePts}<span style={{ fontSize: 13, color: CF.dim }}>pts</span>
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 4 }}>
                council says {selectedPct}% {call.side} · market says {marketPct}% YES
              </div>
            </div>
            {/* bond */}
            <div style={{ textAlign: 'right', borderLeft: `1px solid ${CF.edge}`, paddingLeft: 22 }}>
              <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.5, marginBottom: 6 }}>
                BOND
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 22, fontWeight: 600, color: CF.text }}>
                {call.bondUsdc.toFixed(2)} <span style={{ color: CF.dim, fontSize: 13 }}>USDC</span>
              </div>
            </div>
          </div>

          <div style={{
            fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 10,
          }}>
            Side: <span style={{
              padding: '3px 9px', borderRadius: 999,
              background: `color-mix(in oklab, ${sideColor} 16%, transparent)`,
              border: `1px solid color-mix(in oklab, ${sideColor} 50%, transparent)`,
              color: sideColor, fontWeight: 600,
            }}>BUY {call.side}</span>
            {'   ·   '}
            Market: <a href={`https://sepolia.basescan.org/address/${call.marketAddress}`} target="_blank" rel="noreferrer" style={{ color: CF.dim }}>
              {call.marketAddress.slice(0, 8)}…{call.marketAddress.slice(-4)} ↗
            </a>
          </div>
        </section>

        {/* ── agent votes (public) ────────────────────────────────────── */}
        <section style={{ padding: '20px 0' }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 2, marginBottom: 12 }}>
            COUNCIL VOTES · {agreed}/{roleVotes.length} agreed
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {call.votes.map((v) => {
              const isSkeptic = v.role === 'Skeptic'
              const vColor = isSkeptic ? (call.skepticVerdict === 'APPROVED' ? CF.bull : CF.bear)
                : v.vote === call.side ? sideColor
                : v.vote === 'NEUTRAL' ? CF.amber : CF.dimmer
              return (
                <div key={v.role} style={{
                  padding: '14px 16px', background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 5,
                        background: `color-mix(in oklab, ${vColor} 16%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${vColor} 50%, transparent)`,
                        color: vColor, fontFamily: CF.mono, fontSize: 11, fontWeight: 700,
                      }}>{AGENT_LETTER[v.role] ?? '?'}</span>
                      <span style={{ fontFamily: CF.display, fontWeight: 600, color: CF.text, fontSize: 14 }}>{v.role}</span>
                    </div>
                    <div style={{ fontFamily: CF.mono, fontSize: 12 }}>
                      <span style={{ color: vColor, fontWeight: 600 }}>{v.vote}</span>
                      <span style={{ color: CF.dim }}>  ·  {(v.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: CF.display, fontSize: 12.5, color: CF.dim, lineHeight: 1.55 }}>
                    {v.oneLiner}
                  </div>
                </div>
              )
            })}
          </div>
          {skepticVote ? (
            <div style={{
              marginTop: 10, padding: '12px 16px',
              background: call.skepticVerdict === 'APPROVED'
                ? `color-mix(in oklab, ${CF.bull} 6%, transparent)`
                : `color-mix(in oklab, ${CF.bear} 6%, transparent)`,
              border: `1px solid ${call.skepticVerdict === 'APPROVED' ? CF.bull : CF.bear}`,
              borderRadius: 10,
              fontFamily: CF.mono, fontSize: 11.5,
              color: call.skepticVerdict === 'APPROVED' ? CF.bull : CF.bear,
              letterSpacing: 0.4,
            }}>
              skeptic {call.skepticVerdict === 'APPROVED' ? 'APPROVED' : 'VETOED'} at {(skepticVote.confidence * 100).toFixed(0)}% refutation confidence
            </div>
          ) : null}
        </section>

        {/* ── unlock thesis (the kit-in-main-flow moment) ────────────── */}
        <section style={{ padding: '20px 0' }}>
          <UnlockThesis call={call} />
        </section>
      </div>
    </main>
  )
}
