'use client'

// THE LIVE RUN — the spine. One continuous, narrated arc that stitches the
// working pieces into a single flow a judge can watch end to end:
//
//   1. AUTHORIZE  — you grant a capped mandate (MetaMask Kit · ERC-7715)
//   2. DEBATE     — the council argues and bonds its conviction (A2A · Venice · x402)
//   3. THE REVERT — the enforcer rejects anything over the cap (ERC-7710)  ← the hero
//   4. SETTLE     — executed once on Base mainnet via 1Shot
//   5. ACCOUNT    — every call is Brier-scored; track record sets the next budget
//
// Each stage is the real, independently-runnable component. The spine adds the
// narrative, the track tags, and a progress rail that lights up as each stage
// completes (via each widget's onDone) and auto-scrolls to the next.

import { useState, useRef } from 'react'
import Link from 'next/link'
import { CF, alpha } from '../lib/theme'
import { GrantCouncilMandate } from './GrantCouncilMandate'
import { RunCouncilLive, type MarketChoice } from './RunCouncilLive'
import { RevertProof } from './RevertProof'
import { RelayLive } from './RelayLive'

type StageMeta = { title: string; tags: string[]; caption: string; hero?: boolean }

const STAGES: StageMeta[] = [
  {
    title: 'Approve a spending limit',
    tags: ['MetaMask Kit', 'ERC-7715'],
    caption:
      'You sign once in MetaMask to let the agents spend a few dollars — and not a cent more. It expires on its own, and you can cancel anytime. The limit lives on the blockchain, so no bug in our code can get past it.',
  },
  {
    title: 'The agents debate — and bet',
    tags: ['A2A', 'Venice', 'x402'],
    caption:
      'Each of the five agents gets a slice of your budget. They research the question, debate it live, and a skeptic pushes back. If the call holds up, they put real money behind it.',
  },
  {
    title: 'The blockchain blocks overspending',
    tags: ['ERC-7710'],
    caption:
      'Now watch an agent try to spend more than you allowed. The blockchain rejects it on the spot. Nothing in our code stops it — the network itself refuses.',
    hero: true,
  },
  {
    title: 'Settle it for real on Base',
    tags: ['1Shot'],
    caption:
      'The final bet goes out on Base, the live network, relayed by 1Shot. The fee is even paid in USDC, so you never need ETH for gas.',
  },
  {
    title: 'Keep score',
    tags: ['Brier'],
    caption:
      'Every call is graded once the real outcome is known. Agents with a better track record earn a bigger budget next time. Being right pays.',
  },
]

export function LiveRun({ markets }: { markets: MarketChoice[] }) {
  const [done, setDone] = useState<boolean[]>(() => STAGES.map(() => false))
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const activeIndex = done.findIndex((d) => !d) // first incomplete; -1 when all done

  function complete(i: number) {
    setDone((d) => {
      if (d[i]) return d
      const n = [...d]
      n[i] = true
      return n
    })
    // ease to the next stage so the run feels continuous
    window.setTimeout(() => {
      rowRefs.current[i + 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 500)
  }

  const completedCount = done.filter(Boolean).length

  return (
    <div>
      {/* ── hero ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '40px 0 8px' }}>
        <div className="mono" style={{
          fontSize: 11, letterSpacing: 2.6, color: CF.ink3, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ display: 'inline-block', width: 20, height: 1, background: CF.ink }} />
          THE LIVE RUN
        </div>
        <h1 style={{
          fontFamily: CF.display, fontWeight: 500,
          fontSize: 'clamp(38px, 5.4vw, 60px)', lineHeight: 1.04, letterSpacing: -2,
          margin: '0 0 18px', color: CF.ink,
          fontVariationSettings: '"opsz" 140',
        }}>
          One signature.<br />Five agents.<br />The chain settles.
        </h1>
        <p style={{
          fontFamily: CF.body, fontSize: 17, color: CF.ink2, lineHeight: 1.6,
          maxWidth: 620, margin: '0 0 22px',
        }}>
          See the whole thing happen, start to finish. You approve a small spending
          limit, five AI agents research a prediction and bet real money on it, the
          blockchain blocks anything over your limit, and the bet settles on Base.
          Five real on-chain steps, one flow.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {['MetaMask Kit', 'A2A', 'x402 + ERC-7710', 'Venice', '1Shot'].map((t) => (
            <span key={t} className="mono" style={{
              padding: '5px 10px', borderRadius: 999,
              background: CF.surface2, color: CF.ink2, border: `1px solid ${CF.line}`,
              fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6,
            }}>
              {t}
            </span>
          ))}
          <span className="mono" style={{ fontSize: 11, color: CF.ink3, marginLeft: 4 }}>
            {completedCount}/5 complete
          </span>
        </div>
      </section>

      {/* ── stages ────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        {STAGES.map((meta, i) => {
          const isDone = done[i]
          const isActive = i === activeIndex
          const isLast = i === STAGES.length - 1
          return (
            <div
              key={meta.title}
              ref={(el) => { rowRefs.current[i] = el }}
              style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 18, scrollMarginTop: 24 }}
            >
              {/* spine node + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 999, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? CF.positive : CF.surface,
                  border: `2px solid ${isDone ? CF.positive : isActive ? CF.ink : CF.line2}`,
                  color: isDone ? '#fff' : isActive ? CF.ink : CF.ink4,
                  fontFamily: CF.mono, fontSize: 14, fontWeight: 700,
                  boxShadow: isActive && !isDone ? `0 0 0 4px ${alpha(CF.ink, 8)}` : 'none',
                  transition: 'all 0.25s ease',
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                {!isLast && (
                  <div style={{
                    flex: 1, width: 2, minHeight: 32, marginTop: 6,
                    background: isDone ? CF.positive : CF.line,
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </div>

              {/* stage content */}
              <div style={{ paddingBottom: isLast ? 0 : 44, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {meta.tags.map((t) => (
                    <span key={t} className="mono" style={{
                      padding: '3px 8px', borderRadius: 999,
                      background: meta.hero ? CF.bearTint : CF.bullTint,
                      color: meta.hero ? CF.bearInk : CF.bullInk,
                      fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8,
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
                <h2 style={{
                  fontFamily: CF.display, fontWeight: 500, fontSize: 24, letterSpacing: -0.6,
                  margin: '0 0 6px', color: CF.ink,
                }}>
                  {meta.title}
                </h2>
                <p style={{
                  fontFamily: CF.body, fontSize: 14, color: CF.ink2, lineHeight: 1.55,
                  margin: '0 0 16px', maxWidth: 600,
                }}>
                  {meta.caption}
                </p>

                {/* the real component */}
                {i === 0 && <GrantCouncilMandate onDone={() => complete(0)} />}
                {i === 1 && <RunCouncilLive markets={markets} onDone={() => complete(1)} />}
                {i === 2 && <RevertProof onDone={() => complete(2)} />}
                {i === 3 && <RelayLive onDone={() => complete(3)} />}
                {i === 4 && <AccountabilityPanel onView={() => complete(4)} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AccountabilityPanel({ onView }: { onView: () => void }) {
  return (
    <div style={{
      background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg,
      boxShadow: CF.shadow.card, padding: '20px 22px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.4, color: CF.ink4, marginBottom: 6 }}>
          KEEPING SCORE
        </div>
        <div style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink2, lineHeight: 1.5, maxWidth: 460 }}>
          Agents that call it right earn up to a 1.5× bigger budget; ones that miss get cut to 0.7×.
          The leaderboard is the memory that sizes the next bet.
        </div>
      </div>
      <Link
        href="/leaderboard"
        onClick={onView}
        style={{
          flexShrink: 0,
          padding: '11px 18px', borderRadius: CF.radius.md,
          background: CF.ink, color: CF.bg,
          fontFamily: CF.body, fontSize: 13, fontWeight: 600,
        }}
      >
        View the leaderboard →
      </Link>
    </div>
  )
}
