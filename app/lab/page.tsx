// /lab — the operator console.
//
// Everything that proves CROSSFIRE works on a chain lives here:
//   · Run council live (Venice + x402 + A2A + Kit)
//   · 1Shot mainnet relay (1Shot + 7702 + USDC gas + webhook)
//   · Over-cap revert (ERC-7710 enforcer hero shot)
//   · Phase 1-5 receipts strip
//   · How it works (mechanism block)
//
// The home page is the working product (the feed). This page is the proof
// that the product is real.

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { RunCouncilLive } from '../../components/RunCouncilLive'
import { RelayLive } from '../../components/RelayLive'
import { RevertProof } from '../../components/RevertProof'
import { BrandLogo } from '../../components/Logo'
import { ThemeToggle } from '../../components/ThemeToggle'
import { loadMarketsMeta } from '../../lib/markets-data'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

function Tx({ hash, label, network = 'sepolia' }: { hash: string; label?: string; network?: 'sepolia' | 'mainnet' }) {
  const url = network === 'mainnet'
    ? `https://basescan.org/tx/${hash}`
    : `https://sepolia.basescan.org/tx/${hash}`
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      color: CF.bull, fontFamily: CF.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums',
    }}>
      {label ?? `${hash.slice(0, 8)}…${hash.slice(-6)}`}
    </a>
  )
}

const RECEIPTS = [
  { phase: '01', what: 'ERC-7710 revert proof', detail: 'Over-cap mandate redemption refused at the enforcer.', tx: '0x516d7a44120c3edbb8f4e8dbf54d6c9cab39698f125b75651d6a3cd2586a0e6a', label: 'in-cap success', net: 'sepolia' as const },
  { phase: '02', what: 'A2A redelegation', detail: 'Sub-agent redeems through leaf-to-root chain.', tx: '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41', label: 'Bull 1 USDC', net: 'sepolia' as const },
  { phase: '03', what: 'x402 + Venice', detail: 'Buyer-with-delegation pays for evidence; real USDC moves.', tx: '0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23', label: 'evidence settled', net: 'sepolia' as const },
  { phase: '04', what: 'Adversarial net bet', detail: 'Bull 3.80 vs Bear 7.80 → NO bet sized 4.00 USDC through winning chain.', tx: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c', label: 'bet transfer', net: 'sepolia' as const },
  { phase: '05', what: '1Shot mainnet relay', detail: 'Confirmed (200) · EIP-7702 in-flight upgrade · gas paid in USDC.', tx: '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651', label: 'mainnet confirmed', net: 'mainnet' as const },
]

export default async function Lab() {
  const marketChoices = loadMarketsMeta().map((m) => ({ id: m.id, title: m.title }))

  return (
    <main style={{
      background: CF.bg, color: CF.ink, minHeight: '100vh',
      padding: '0 24px 96px',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* nav */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={28} />
            <span style={{
              fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink,
            }}>
              CROSSFIRE
            </span>
            <span style={{
              marginLeft: 4, padding: '2px 7px', borderRadius: 999,
              background: CF.surface2, color: CF.ink2,
              fontFamily: CF.mono, fontSize: 10, letterSpacing: 0.5,
            }}>
              the lab
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link href="/" style={navLinkStyle}>← Feed</Link>
            <Link href="/leaderboard" style={navLinkStyle}>Leaderboard</Link>
            <span style={{ width: 8 }} />
            <ThemeToggle />
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* title */}
        <section style={{ padding: '40px 0 24px' }}>
          <div className="mono" style={{
            fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
            OPERATIONS · PROOF
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 500,
            fontSize: 'clamp(38px, 5vw, 54px)', lineHeight: 1.05, letterSpacing: -1.6,
            margin: '0 0 12px', color: CF.ink,
            fontVariationSettings: '"opsz" 120',
          }}>
            The Lab
          </h1>
          <p style={{
            fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.55,
            margin: 0, maxWidth: 680,
          }}>
            Drive every primitive that powers the arena: run the panel of agents
            live, relay a real 7710 tx on Base mainnet through 1Shot, and watch
            the chain refuse an over-cap bet at the enforcer.
          </p>
        </section>

        {/* operations */}
        <section style={{ padding: '10px 0 8px' }}>
          <RunCouncilLive markets={marketChoices} />
        </section>
        <section style={{ padding: '6px 0 8px' }}>
          <RelayLive />
        </section>
        <section style={{ padding: '6px 0 8px' }}>
          <RevertProof />
        </section>

        {/* receipts */}
        <section id="proof" style={{
          padding: '40px 0 28px', borderTop: `1px solid ${CF.line}`, marginTop: 36,
        }}>
          <div className="mono" style={{
            fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10,
          }}>
            ON-CHAIN RECEIPTS
          </div>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 500, fontSize: 32,
            letterSpacing: -0.8, color: CF.ink, margin: '0 0 22px',
            fontVariationSettings: '"opsz" 80', maxWidth: 720,
          }}>
            Every primitive verified on a real chain.
          </h2>
          <div style={{
            background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg,
            boxShadow: CF.shadow.card, overflow: 'hidden',
          }}>
            {RECEIPTS.map((r, i) => (
              <div key={r.phase} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr auto',
                gap: 20, alignItems: 'center',
                padding: '16px 22px',
                borderBottom: i < RECEIPTS.length - 1 ? `1px solid ${CF.line}` : 'none',
              }}>
                <div className="mono" style={{
                  fontSize: 14, fontWeight: 600, color: CF.ink3, letterSpacing: 0.5,
                }}>
                  {r.phase}
                </div>
                <div>
                  <div style={{
                    fontFamily: CF.body, fontSize: 14, fontWeight: 600, color: CF.ink, marginBottom: 4,
                  }}>
                    {r.what}
                  </div>
                  <div style={{
                    fontFamily: CF.body, fontSize: 13, color: CF.ink2, lineHeight: 1.5,
                  }}>
                    {r.detail}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tx hash={r.tx} label={r.label} network={r.net} />
                  <div className="mono" style={{
                    fontSize: 10, color: CF.ink4, marginTop: 4, letterSpacing: 0.4,
                  }}>
                    {r.net === 'mainnet' ? 'Base mainnet' : 'Base Sepolia'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* mechanism */}
        <section id="mechanism" style={{
          padding: '40px 0 24px', borderTop: `1px solid ${CF.line}`, marginTop: 8,
        }}>
          <div className="mono" style={{
            fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10,
          }}>
            HOW IT WORKS
          </div>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 500, fontSize: 32,
            letterSpacing: -0.8, color: CF.ink, margin: '0 0 8px',
            fontVariationSettings: '"opsz" 80', maxWidth: 720,
          }}>
            Five pundits. One contrarian.<br />
            <span style={{ fontStyle: 'italic', color: CF.ink2 }}>The chain enforces the stake.</span>
          </h2>
          <p style={{
            fontFamily: CF.body, fontSize: 15, color: CF.ink2, maxWidth: 640,
            margin: '0 0 28px', lineHeight: 1.55,
          }}>
            Conviction is not a number an agent claims — it's USDC each pundit
            actually stakes on its call, capped by a chain-enforced delegation.
            It can’t bluff.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
            borderTop: `1px solid ${CF.line}`,
          }}>
            <Step
              n="01"
              title="The panel calls the match"
              body={
                <>
                  <em style={{ color: CF.bull, fontStyle: 'normal' }}>GAFFER</em>, <em style={{ color: CF.bull, fontStyle: 'normal' }}>THE SCOUT</em>, <em style={{ color: CF.bull, fontStyle: 'normal' }}>THE ULTRA</em>, and <em style={{ color: CF.bull, fontStyle: 'normal' }}>xG</em> each read a different angle. <em style={{ color: CF.bear, fontStyle: 'normal' }}>THE PUNDIT</em> goes last — and can veto.
                </>
              }
            />
            <Step
              n="02"
              title="Quality gate"
              body={
                <>
                  Publishes only if <strong style={{ color: CF.ink, fontWeight: 600 }}>≥3 of 4 agree</strong>, the Skeptic doesn't veto, edge over market is ≥5 points, and the bond fits the treasury cap.
                </>
              }
              middle
            />
            <Step
              n="03"
              title="Bond + unlock"
              body={
                <>
                  Passing calls get an on-chain bond via <strong style={{ color: CF.ink, fontWeight: 600 }}>ERC-7710</strong> mandate. Headline is free. Users pay a tiny USDC <strong style={{ color: CF.ink, fontWeight: 600 }}>x402 micropayment</strong> to read the full thesis.
                </>
              }
            />
          </div>
        </section>
      </div>
    </main>
  )
}

const navLinkStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: CF.radius.md,
  fontFamily: CF.body, fontSize: 13, fontWeight: 500,
  color: CF.ink2,
}

function Step({ n, title, body, middle = false }: { n: string; title: string; body: React.ReactNode; middle?: boolean }) {
  return (
    <div style={{
      padding: '24px 22px 28px',
      borderRight: middle ? `1px solid ${CF.line}` : 'none',
      borderLeft: middle ? `1px solid ${CF.line}` : 'none',
    }}>
      <div className="mono" style={{
        fontSize: 11, letterSpacing: 1.6, color: CF.ink3, marginBottom: 16,
      }}>
        {n}
      </div>
      <div style={{
        fontFamily: CF.display, fontWeight: 500, fontSize: 20,
        letterSpacing: -0.4, color: CF.ink, marginBottom: 10,
        fontVariationSettings: '"opsz" 36',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: CF.body, fontSize: 14, color: CF.ink2, lineHeight: 1.55,
      }}>
        {body}
      </div>
    </div>
  )
}
