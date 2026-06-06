// CROSSFIRE landing — public calls feed.
//
// Phase 8.1: hand-crafted sample published calls so the product is
// legible immediately. Phase 8.2+ will swap loadCalls() for the real
// council's published-call store.

import { ConnectButton } from '../components/ConnectButton'
import { CallCard } from '../components/CallCard'
import { loadCalls } from '../lib/calls-data'

export const dynamic = 'force-dynamic'

const CF = {
  black: '#000000',
  bg: '#060608',
  panel: '#0c0c11',
  panelHi: '#101017',
  edge: '#1b1b23',
  edgeHi: '#2a2a36',
  text: '#ededf2',
  dim: '#8a8a99',
  dimmer: '#5a5a68',
  bull: '#3bc4ff',
  bullDeep: '#0a3a52',
  bear: '#ff2a4d',
  bearDeep: '#520a17',
  white: '#ffffff',
  amber: '#ffbd45',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <line x1="16" y1="16" x2="84" y2="84" stroke={CF.bull} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 ${size * 0.2}px ${CF.bull})`, opacity: 0.9 }} />
      <line x1="84" y1="16" x2="16" y2="84" stroke={CF.bear} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 ${size * 0.2}px ${CF.bear})`, opacity: 0.9 }} />
      <circle cx="50" cy="50" r="7" fill={CF.white}
        style={{ filter: `drop-shadow(0 0 ${size * 0.25}px ${CF.white})` }} />
    </svg>
  )
}

function Tx({ hash, label, network = 'sepolia' }: { hash: string; label?: string; network?: 'sepolia' | 'mainnet' }) {
  const url = network === 'mainnet'
    ? `https://basescan.org/tx/${hash}`
    : `https://sepolia.basescan.org/tx/${hash}`
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      color: CF.bull, textDecoration: 'none', fontFamily: CF.mono, fontSize: 12,
    }}>
      {label ?? `${hash.slice(0, 8)}…${hash.slice(-6)}`}
    </a>
  )
}

const RECEIPTS = [
  { phase: '1', what: 'ERC-7710 revert proof', detail: 'Over-cap mandate redemption refused at the enforcer', tx: '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45', label: 'in-cap success', net: 'sepolia' as const },
  { phase: '2', what: 'A2A redelegation', detail: 'Sub-agent redeems through leaf-to-root chain', tx: '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41', label: 'Bull 1 USDC', net: 'sepolia' as const },
  { phase: '3', what: 'x402 + Venice', detail: 'Buyer-with-delegation pays for evidence; real USDC moves', tx: '0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23', label: 'evidence settled', net: 'sepolia' as const },
  { phase: '4', what: 'Adversarial net bet', detail: 'Bull 3.80 vs Bear 7.80 → NO bet sized 4.00 USDC through winning chain', tx: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c', label: 'bet transfer', net: 'sepolia' as const },
  { phase: '5', what: '1Shot mainnet relay', detail: 'Confirmed (200) · EIP-7702 in-flight upgrade · gas paid in USDC', tx: '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651', label: 'mainnet confirmed', net: 'mainnet' as const },
]

export default async function Landing() {
  const calls = loadCalls()

  return (
    <main style={{
      background: CF.bg, color: CF.text, minHeight: '100vh',
      padding: '0 32px 60px',
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* ── NAV ── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0', borderBottom: `1px solid ${CF.edge}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <LogoMark size={26} />
            <span style={{ fontFamily: CF.display, fontWeight: 700, fontSize: 16, letterSpacing: 3.4, color: CF.text }}>
              CROSSFIRE
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" style={navLinkStyle()}>
              GitHub ↗
            </a>
            <a href="#proof" style={navLinkStyle()}>
              Proof
            </a>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* ── HERO ── */}
        <section style={{ padding: '64px 0 40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', marginBottom: 24 }}>
            <LogoMark size={68} />
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 44, lineHeight: 1.1,
            letterSpacing: -1.2, margin: '0 0 18px', color: CF.text,
          }}>
            An adversarial council
            <br />
            <span style={{ color: CF.dim }}>publishes prediction-market calls.</span>
          </h1>
          <p style={{
            fontFamily: CF.display, fontSize: 17, lineHeight: 1.6,
            color: CF.dim, maxWidth: 680, margin: '0 auto 30px',
          }}>
            Five role agents read live markets, buy evidence with USDC, vote, and either bond a call or stay silent. Browse the feed free. Pay a few cents in USDC to unlock the full thesis — the reasoning trace, the evidence URLs, the Skeptic's rebuttal, the sizing logic.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <a href="#calls" style={ctaPrimary()}>
              See the live calls <span style={{ color: CF.bull, marginLeft: 4 }}>↓</span>
            </a>
            <a href="#mechanism" style={ctaSecondary()}>
              How it works
            </a>
          </div>
        </section>

        {/* ── LIVE CALLS FEED ── */}
        <section id="calls" style={{ padding: '40px 0 20px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16,
          }}>
            <h2 style={{
              fontFamily: CF.display, fontWeight: 700, fontSize: 22, color: CF.text,
              margin: 0, letterSpacing: -0.3,
            }}>
              Live calls
            </h2>
            <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 0.5 }}>
              {calls.length} bonded · headline free · unlock $0.10 USDC
            </div>
          </div>

          {calls.length === 0 ? (
            <div style={{
              padding: 32, background: CF.panel, border: `1px solid ${CF.edge}`,
              borderRadius: 12, fontFamily: CF.mono, color: CF.dim, textAlign: 'center',
            }}>
              No calls published yet. The council is still warming up.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {calls.map((c) => <CallCard key={c.id} call={c} />)}
            </div>
          )}
        </section>

        {/* ── MECHANISM ── */}
        <section id="mechanism" style={{ padding: '50px 0 30px', borderTop: `1px solid ${CF.edge}`, marginTop: 30 }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 2.5, marginBottom: 10 }}>
            HOW IT WORKS
          </div>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 28, letterSpacing: -0.4,
            color: CF.text, margin: '0 0 32px',
          }}>
            Five agents. One Skeptic. The chain enforces the bond.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Step
              n="01"
              title="Council reads + votes"
              body={
                <>
                  <span style={{ color: CF.bull }}>MacroScout</span>, <span style={{ color: CF.bull }}>NewsHawk</span>, <span style={{ color: CF.bull }}>CrowdPulse</span>, and <span style={{ color: CF.bull }}>BookWatcher</span> each read different inputs. The <span style={{ color: CF.bear }}>Skeptic</span> votes last and can veto.
                </>
              }
            />
            <Step
              n="02"
              title="Quality gate"
              body={
                <>
                  Publishes only if <span style={{ color: CF.text }}>≥3 of 4 agree</span>, the <span style={{ color: CF.bear }}>Skeptic doesn't veto</span>, edge over market is ≥5 points, and the bond fits the treasury cap.
                </>
              }
            />
            <Step
              n="03"
              title="Bond + unlock"
              body={
                <>
                  Passing calls get an on-chain bond via <span style={{ color: CF.text }}>ERC-7710</span> mandate. Headline is free. Users pay a tiny USDC <span style={{ color: CF.text }}>x402 micropayment</span> to read the full thesis.
                </>
              }
            />
          </div>
        </section>

        {/* ── ON-CHAIN PROOF ── */}
        <section id="proof" style={{ padding: '50px 0 30px', borderTop: `1px solid ${CF.edge}`, marginTop: 20 }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 2.5, marginBottom: 10 }}>
            ON-CHAIN PROOF
          </div>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 28, letterSpacing: -0.4,
            color: CF.text, margin: '0 0 24px',
          }}>
            Every primitive verified on a real chain.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RECEIPTS.map((r) => (
              <div key={r.phase} style={{
                display: 'grid', gridTemplateColumns: '50px 1fr auto',
                gap: 16, alignItems: 'center',
                padding: '14px 18px', background: CF.panel,
                border: `1px solid ${CF.edge}`, borderRadius: 8,
              }}>
                <div style={{ fontFamily: CF.mono, fontSize: 18, fontWeight: 700, color: CF.dim }}>
                  {r.phase}
                </div>
                <div>
                  <div style={{ fontFamily: CF.display, fontSize: 14, fontWeight: 600, color: CF.text, marginBottom: 3 }}>
                    {r.what}
                  </div>
                  <div style={{ fontFamily: CF.display, fontSize: 12, color: CF.dim, lineHeight: 1.5 }}>
                    {r.detail}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tx hash={r.tx} label={r.label} network={r.net} />
                  <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dimmer, marginTop: 3 }}>
                    {r.net === 'mainnet' ? 'Base mainnet' : 'Base Sepolia'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          marginTop: 40, paddingTop: 24, borderTop: `1px solid ${CF.edge}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <LogoMark size={18} />
            <span style={{ fontFamily: CF.mono, fontSize: 11.5, color: CF.dim, letterSpacing: 0.5 }}>
              accountable agent calls · the chain settles
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18, fontFamily: CF.mono, fontSize: 12 }}>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" style={{ color: CF.dim, textDecoration: 'none' }}>GitHub</a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/PROOF.md" target="_blank" rel="noreferrer" style={{ color: CF.dim, textDecoration: 'none' }}>PROOF.md</a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/README.md" target="_blank" rel="noreferrer" style={{ color: CF.dim, textDecoration: 'none' }}>README</a>
          </div>
        </footer>
      </div>
    </main>
  )
}

function navLinkStyle(): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 7, textDecoration: 'none',
    fontFamily: CF.mono, fontSize: 12, letterSpacing: 0.3,
    border: `1px solid ${CF.edge}`,
    color: CF.dim,
  }
}

function ctaPrimary(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '12px 20px', borderRadius: 9, textDecoration: 'none',
    background: CF.text, color: '#000',
    fontFamily: CF.display, fontSize: 13.5, fontWeight: 600, letterSpacing: 0.2,
    boxShadow: '0 0 24px color-mix(in oklab, #fff 14%, transparent)',
  }
}

function ctaSecondary(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '12px 20px', borderRadius: 9, textDecoration: 'none',
    border: `1px solid ${CF.edge}`, color: CF.dim,
    fontFamily: CF.display, fontSize: 13.5, fontWeight: 500,
  }
}

function Step({ n, title, body }: { n: string; title: string; body: React.ReactNode }) {
  return (
    <div style={{
      padding: '22px 22px',
      background: CF.panel,
      border: `1px solid ${CF.edge}`,
      borderRadius: 10,
    }}>
      <div style={{
        fontFamily: CF.mono, fontSize: 11, letterSpacing: 1.8, color: CF.dim, marginBottom: 14,
      }}>
        {n}
      </div>
      <div style={{
        fontFamily: CF.display, fontSize: 17, fontWeight: 600, color: CF.text, marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: CF.display, fontSize: 13, color: CF.dim, lineHeight: 1.6,
      }}>
        {body}
      </div>
    </div>
  )
}
