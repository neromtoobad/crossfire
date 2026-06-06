// CROSSFIRE landing — light editorial system (Phase 8.11).
//
// Layout: 1080px column, mathematical 8pt rhythm, hairline dividers.
// Voice: Fraunces display + Inter body, JetBrains Mono only for tx hashes.

import { ConnectButton } from '../components/ConnectButton'
import { CallCard } from '../components/CallCard'
import { RunCouncilLive } from '../components/RunCouncilLive'
import { RelayLive } from '../components/RelayLive'
import { loadCalls } from '../lib/calls-data'
import { loadMarketsMeta } from '../lib/markets-data'
import { CF } from '../lib/theme'

export const dynamic = 'force-dynamic'

function LogoMark({ size = 30 }: { size?: number }) {
  // Two crossing strokes — Bull blue / Bear crimson — no glow, weight matters.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      <line x1="18" y1="18" x2="82" y2="82" stroke={CF.bull} strokeWidth="7" strokeLinecap="round" />
      <line x1="82" y1="18" x2="18" y2="82" stroke={CF.bear} strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="5" fill={CF.ink} />
    </svg>
  )
}

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
  { phase: '01', what: 'ERC-7710 revert proof', detail: 'Over-cap mandate redemption refused at the enforcer.', tx: '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45', label: 'in-cap success', net: 'sepolia' as const },
  { phase: '02', what: 'A2A redelegation', detail: 'Sub-agent redeems through leaf-to-root chain.', tx: '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41', label: 'Bull 1 USDC', net: 'sepolia' as const },
  { phase: '03', what: 'x402 + Venice', detail: 'Buyer-with-delegation pays for evidence; real USDC moves.', tx: '0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23', label: 'evidence settled', net: 'sepolia' as const },
  { phase: '04', what: 'Adversarial net bet', detail: 'Bull 3.80 vs Bear 7.80 → NO bet sized 4.00 USDC through winning chain.', tx: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c', label: 'bet transfer', net: 'sepolia' as const },
  { phase: '05', what: '1Shot mainnet relay', detail: 'Confirmed (200) · EIP-7702 in-flight upgrade · gas paid in USDC.', tx: '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651', label: 'mainnet confirmed', net: 'mainnet' as const },
]

export default async function Landing() {
  const calls = loadCalls()
  const marketChoices = loadMarketsMeta().map((m) => ({ id: m.id, title: m.title }))

  return (
    <main style={{
      background: CF.bg, color: CF.ink, minHeight: '100vh',
      padding: '0 24px 96px',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* ── NAV ── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoMark size={26} />
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
              vol. 01 · the desk
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <a href="/leaderboard" style={navLinkStyle}>Leaderboard</a>
            <a href="#proof" style={navLinkStyle}>Proof</a>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" style={navLinkStyle}>
              GitHub <span style={{ color: CF.ink3 }}>↗</span>
            </a>
            <span style={{ width: 12 }} />
            <ConnectButton variant="primary" />
          </nav>
        </header>

        {/* ── EDITORIAL HERO ── */}
        <section style={{ padding: '72px 0 48px' }}>
          <div style={{
            fontFamily: CF.mono, fontSize: 11, letterSpacing: 2.4, color: CF.ink3,
            marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'inline-block', width: 24, height: 1, background: CF.ink }} />
            ISSUE 01 · LIVE FEED
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 500,
            fontSize: 'clamp(48px, 7vw, 78px)', lineHeight: 1.02,
            letterSpacing: -2.4, margin: '0 0 24px', color: CF.ink,
            fontVariationSettings: '"opsz" 144',
            maxWidth: 920,
          }}>
            An adversarial council<br />
            <span style={{ fontStyle: 'italic', color: CF.ink2 }}>publishes prediction-market calls.</span>
          </h1>
          <p style={{
            fontFamily: CF.body, fontSize: 18, lineHeight: 1.55,
            color: CF.ink2, maxWidth: 680, margin: '0 0 30px',
          }}>
            Five role agents read live markets, buy evidence with USDC, and vote.
            Calls that survive the Skeptic and the quality gate get an on-chain
            bond — and a card on the wire. Browse the feed free. Pay a few cents
            to unlock the full thesis.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href="#live" style={ctaPrimary}>
              Watch a call get made <span style={{ marginLeft: 6 }}>→</span>
            </a>
            <a href="#calls" style={ctaSecondary}>
              See the feed
            </a>
          </div>
        </section>

        {/* ── LIVE COUNCIL ── */}
        <section id="live" style={{ padding: '12px 0 12px' }}>
          <RunCouncilLive markets={marketChoices} />
        </section>

        {/* ── 1SHOT MAINNET RELAY ── */}
        <section id="relay" style={{ padding: '6px 0 12px' }}>
          <RelayLive />
        </section>

        {/* ── LIVE CALLS FEED ── */}
        <section id="calls" style={{ padding: '40px 0 24px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginBottom: 24, paddingBottom: 14, borderBottom: `1px solid ${CF.line}`,
          }}>
            <div>
              <div style={{
                fontFamily: CF.mono, fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 6,
              }}>
                THE WIRE · LIVE FEED
              </div>
              <h2 style={{
                fontFamily: CF.display, fontWeight: 500, fontSize: 36,
                letterSpacing: -1, color: CF.ink, margin: 0,
                fontVariationSettings: '"opsz" 96',
              }}>
                Today's calls
              </h2>
            </div>
            <div className="mono tnum" style={{ fontSize: 11.5, color: CF.ink3, letterSpacing: 0.5 }}>
              {calls.length} bonded · headline free · unlock $0.10 USDC
            </div>
          </div>

          {calls.length === 0 ? (
            <div style={{
              padding: 40, background: CF.surface, border: `1px solid ${CF.line}`,
              borderRadius: CF.radius.lg, color: CF.ink2, textAlign: 'center',
              fontFamily: CF.body, fontSize: 14,
            }}>
              No calls published yet. The council is still warming up.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {calls.map((c) => <CallCard key={c.id} call={c} />)}
            </div>
          )}
        </section>

        {/* ── MECHANISM ── */}
        <section id="mechanism" style={{
          padding: '72px 0 32px', borderTop: `1px solid ${CF.line}`, marginTop: 40,
        }}>
          <div style={{
            fontFamily: CF.mono, fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10,
          }}>
            THE MECHANISM
          </div>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 500, fontSize: 40,
            letterSpacing: -1, color: CF.ink, margin: '0 0 8px',
            fontVariationSettings: '"opsz" 96', maxWidth: 720,
          }}>
            Five agents. One Skeptic.<br />
            <span style={{ fontStyle: 'italic', color: CF.ink2 }}>The chain enforces the bond.</span>
          </h2>
          <p style={{
            fontFamily: CF.body, fontSize: 15.5, color: CF.ink2, maxWidth: 640,
            margin: '0 0 36px', lineHeight: 1.55,
          }}>
            Conviction is not a number an agent claims — it's USDC the council
            actually spends and stakes, capped by a chain-enforced delegation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: `1px solid ${CF.line}` }}>
            <Step
              n="01"
              title="Council reads + votes"
              body={
                <>
                  <em style={{ color: CF.bull, fontStyle: 'normal' }}>MacroScout</em>, <em style={{ color: CF.bull, fontStyle: 'normal' }}>NewsHawk</em>, <em style={{ color: CF.bull, fontStyle: 'normal' }}>CrowdPulse</em>, and <em style={{ color: CF.bull, fontStyle: 'normal' }}>BookWatcher</em> each read different inputs. The <em style={{ color: CF.bear, fontStyle: 'normal' }}>Skeptic</em> votes last — and can veto.
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

        {/* ── ON-CHAIN PROOF ── */}
        <section id="proof" style={{
          padding: '72px 0 32px', borderTop: `1px solid ${CF.line}`, marginTop: 24,
        }}>
          <div style={{
            fontFamily: CF.mono, fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10,
          }}>
            ON-CHAIN PROOF
          </div>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 500, fontSize: 40,
            letterSpacing: -1, color: CF.ink, margin: '0 0 28px',
            fontVariationSettings: '"opsz" 96', maxWidth: 640,
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
                padding: '18px 24px',
                borderBottom: i < RECEIPTS.length - 1 ? `1px solid ${CF.line}` : 'none',
              }}>
                <div className="mono" style={{
                  fontSize: 14, fontWeight: 600, color: CF.ink3, letterSpacing: 0.5,
                }}>
                  {r.phase}
                </div>
                <div>
                  <div style={{
                    fontFamily: CF.body, fontSize: 14.5, fontWeight: 600, color: CF.ink, marginBottom: 4,
                  }}>
                    {r.what}
                  </div>
                  <div style={{
                    fontFamily: CF.body, fontSize: 13, color: CF.ink2, lineHeight: 1.55,
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

        {/* ── FOOTER ── */}
        <footer style={{
          marginTop: 56, paddingTop: 24, borderTop: `1px solid ${CF.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoMark size={18} />
            <span className="mono" style={{ fontSize: 11, color: CF.ink3, letterSpacing: 0.5 }}>
              accountable agent calls · the chain settles
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: CF.ink2 }}>GitHub</a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/PROOF.md" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: CF.ink2 }}>PROOF.md</a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/README.md" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: CF.ink2 }}>README</a>
          </div>
        </footer>
      </div>
    </main>
  )
}

const navLinkStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: CF.radius.md,
  fontFamily: CF.body, fontSize: 13, fontWeight: 500,
  color: CF.ink2,
}

const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '14px 20px', borderRadius: CF.radius.lg,
  background: CF.ink, color: CF.bg,
  fontFamily: CF.body, fontSize: 14, fontWeight: 600,
  boxShadow: CF.shadow.card,
}

const ctaSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '14px 20px', borderRadius: CF.radius.lg,
  border: `1px solid ${CF.line2}`,
  background: CF.surface, color: CF.ink,
  fontFamily: CF.body, fontSize: 14, fontWeight: 500,
}

function Step({ n, title, body, middle = false }: { n: string; title: string; body: React.ReactNode; middle?: boolean }) {
  return (
    <div style={{
      padding: '28px 24px 32px',
      borderRight: middle ? `1px solid ${CF.line}` : 'none',
      borderLeft: middle ? `1px solid ${CF.line}` : 'none',
    }}>
      <div className="mono" style={{
        fontSize: 11, letterSpacing: 1.6, color: CF.ink3, marginBottom: 18,
      }}>
        {n}
      </div>
      <div style={{
        fontFamily: CF.display, fontWeight: 500, fontSize: 22,
        letterSpacing: -0.4, color: CF.ink, marginBottom: 12,
        fontVariationSettings: '"opsz" 36',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: CF.body, fontSize: 14.5, color: CF.ink2, lineHeight: 1.6,
      }}>
        {body}
      </div>
    </div>
  )
}
