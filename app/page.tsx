// CROSSFIRE landing — explains the mechanism before the dashboard.
// Server-rendered shell with a single client island for the wallet
// connect button.

import { ConnectButton } from '../components/ConnectButton'
import { readAllMarketsLive, type MarketLive } from '../lib/markets-data.js'

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

// ── Reusable section card ────────────────────────────────────────────────
function Section({
  eyebrow,
  title,
  children,
  style,
}: {
  eyebrow?: string
  title?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section style={{ padding: '60px 0', borderTop: `1px solid ${CF.edge}`, ...style }}>
      {eyebrow ? (
        <div style={{
          fontFamily: CF.mono, fontSize: 11, letterSpacing: 2.5,
          color: CF.dim, textTransform: 'uppercase', marginBottom: 10,
        }}>{eyebrow}</div>
      ) : null}
      {title ? (
        <h2 style={{
          fontFamily: CF.display, fontWeight: 700, fontSize: 32, letterSpacing: -0.5,
          margin: '0 0 36px', color: CF.text,
        }}>{title}</h2>
      ) : null}
      {children}
    </section>
  )
}

// ── On-chain receipts (frozen, ground truth from PROOF.md) ───────────────
const RECEIPTS = [
  {
    phase: '1', what: 'Revert proof',
    detail: <>Over-cap redemption refused — <code style={{ color: CF.bear, background: CF.panel, padding: '2px 6px', borderRadius: 3 }}>ERC20TransferAmountEnforcer:allowance-exceeded</code></>,
    tx: '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45',
    label: 'in-cap success', net: 'sepolia' as const,
  },
  {
    phase: '2', what: 'A2A duel skeleton',
    detail: 'Bull and Bear redeem through their own redelegation chains independently',
    tx: '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41',
    label: 'Bull 1 USDC', net: 'sepolia' as const,
  },
  {
    phase: '3', what: 'x402 + Venice',
    detail: 'Buyer-with-delegation pays for evidence; Venice produces conviction + verdict card image',
    tx: '0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23',
    label: 'evidence settled', net: 'sepolia' as const,
  },
  {
    phase: '4', what: 'Net bet placed',
    detail: 'Bull stake 3.80, Bear stake 7.80 → NO bet sized 4.00 USDC through Bear chain',
    tx: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c',
    label: 'bet transfer', net: 'sepolia' as const,
  },
  {
    phase: '5', what: '1Shot mainnet relay',
    detail: 'Confirmed (200) on Base mainnet · EIP-7702 in-flight upgrade · gas paid in USDC',
    tx: '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651',
    label: 'mainnet confirmed', net: 'mainnet' as const,
  },
]

const TRACKS = [
  { name: 'A2A Coordination', prize: '$3,000', color: CF.bull, what: 'Bull / Bear redelegation chain, each child caps independently' },
  { name: 'x402 + ERC-7710', prize: '$3,000', color: CF.bull, what: 'Buyer-with-delegation flow, evidence settled per call on-chain' },
  { name: 'Venice AI', prize: '$3,000', color: CF.bear, what: 'Only model provider in the repo (grep-enforced), enable_web_scraping live' },
  { name: '1Shot Relayer', prize: '$1,000', color: CF.bear, what: 'Real Base-mainnet relay, EIP-7702 upgrade, gas in USDC, status Confirmed' },
]

// ──────────────────────────────────────────────────────────────────────────
export default async function Landing() {
  const markets = await readAllMarketsLive()
  return (
    <main style={{
      background: CF.bg, color: CF.text, minHeight: '100vh',
      padding: '0 32px 60px',
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* ── nav ── */}
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
            <a href="/dashboard" style={navLinkStyle()}>
              Dashboard →
            </a>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* ── hero ── */}
        <section style={{ padding: '90px 0 60px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', marginBottom: 28 }}>
            <LogoMark size={88} />
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 56, lineHeight: 1.05,
            letterSpacing: -1.5, margin: '0 0 22px', color: CF.text,
          }}>
            Two adversarial agents fight inside a budget
            <br />
            <span style={{ color: CF.dim }}>the chain refuses to let them break.</span>
          </h1>
          <p style={{
            fontFamily: CF.display, fontSize: 18, lineHeight: 1.55,
            color: CF.dim, maxWidth: 720, margin: '0 auto 40px',
          }}>
            A user signs <span style={{ color: CF.text }}>once</span> to grant a capped, expiring USDC mandate. An orchestrator splits it into two opposed sub-budgets — a <span style={{ color: CF.bull, fontWeight: 600 }}>Bull</span> arguing YES, a <span style={{ color: CF.bear, fontWeight: 600 }}>Bear</span> arguing NO. Each spends real USDC buying evidence, reasons with Venice, and stakes from its capped budget. The bet that hits the market is the <span style={{ color: CF.text }}>net</span> of their conviction.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <a href="#markets" style={ctaPrimaryStyle()}>
              Pick a market <span style={{ color: CF.bull, marginLeft: 4 }}>↓</span>
            </a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/PROOF.md" target="_blank" rel="noreferrer" style={ctaSecondaryStyle()}>
              PROOF.md
            </a>
          </div>

          {/* Hero shot — the revert error */}
          <div style={{
            marginTop: 60, padding: '22px 24px', maxWidth: 720, marginInline: 'auto',
            background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 10,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: CF.bear, boxShadow: `0 0 12px ${CF.bear}`,
            }} />
            <div style={{
              fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.8, color: CF.dim, marginBottom: 12,
            }}>HERO SHOT — THE OVER-CAP REVERT</div>
            <div style={{
              fontFamily: CF.mono, fontSize: 17, color: CF.bear, fontWeight: 600, letterSpacing: -0.3, wordBreak: 'break-word',
            }}>
              ERC20TransferAmountEnforcer:allowance-exceeded
            </div>
            <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim, marginTop: 12, lineHeight: 1.5 }}>
              No code stops this. The chain does. Verified live on Base Sepolia at{' '}
              <Tx hash="0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45" label="0xa8d4…ee45" />.
            </div>
          </div>
        </section>

        {/* ── markets grid (LIVE from chain) ── */}
        <Section eyebrow="Pick a market" title="Send the agents on one of these.">
          <div id="markets" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {markets.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', fontFamily: CF.mono, color: CF.dim, padding: 20 }}>
                No markets deployed yet. Run <code style={{ color: CF.bull }}>npm run deploy:markets</code>.
              </div>
            ) : (
              markets.map((m) => <MarketCard key={m.id} m={m} />)
            )}
          </div>
        </Section>

        {/* ── how it works ── */}
        <Section eyebrow="The mechanism" title="One signature. Two opposed agents. The chain referees.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            <Step
              n="01"
              color={CF.text}
              title="Mandate"
              body={<>The user signs an ERC-7710 delegation: <span style={{ color: CF.text }}>50 USDC cap</span>, 24h expiry, allowed targets restricted to USDC + the market. Caveats encode every limit. The user's private key never moves.</>}
            />
            <Step
              n="02"
              color={CF.dim}
              title="Duel"
              body={<>The orchestrator redelegates two opposed sub-budgets: <span style={{ color: CF.bull, fontWeight: 600 }}>Bull</span> 20 USDC and <span style={{ color: CF.bear, fontWeight: 600 }}>Bear</span> 20 USDC. Each agent buys evidence via x402 (real USDC drawn through the chain), reasons with Venice (the only model provider), and stakes from what remains.</>}
            />
            <Step
              n="03"
              color={CF.text}
              title="Net bet"
              body={<>The system places a bet sized by <span style={{ color: CF.text }}>|bullStake − bearStake|</span>, redeemed through the winning sub's chain. If the spread is below dust, it places nothing and surfaces <span style={{ color: CF.amber }}>market genuinely uncertain</span>.</>}
            />
          </div>

          <div style={{
            marginTop: 36, padding: '24px 24px', background: CF.panel,
            border: `1px solid ${CF.edge}`, borderRadius: 10,
          }}>
            <div style={{ fontFamily: CF.mono, fontSize: 11, letterSpacing: 2, color: CF.dim, marginBottom: 16 }}>
              WHY THIS IS NOT A DIAGRAM
            </div>
            <p style={{ margin: 0, fontFamily: CF.display, fontSize: 15, color: CF.text, lineHeight: 1.6 }}>
              Bluffing is impossible because conviction <span style={{ color: CF.bull }}>is</span> USDC. An agent that spent 0.5 on evidence and stakes 7.30 has committed 7.80 of real capital under a chain-enforced cap. There's no narrative — only a delegation chain, a USDC balance, and a transaction receipt. The chain refuses every path that breaks a cap, and the refusal looks like <code style={{ color: CF.bear, background: CF.bg, padding: '1px 6px', borderRadius: 3 }}>ERC20TransferAmountEnforcer:allowance-exceeded</code>. Not an error. A feature.
            </p>
          </div>
        </Section>

        {/* ── on-chain proof ── */}
        <Section eyebrow="On-chain proof" title="Every claim has a transaction.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RECEIPTS.map((r) => (
              <div key={r.phase} style={{
                display: 'grid', gridTemplateColumns: '60px 1fr auto',
                gap: 18, alignItems: 'center',
                padding: '16px 18px', background: CF.panel,
                border: `1px solid ${CF.edge}`, borderRadius: 8,
              }}>
                <div style={{ fontFamily: CF.mono, fontSize: 24, fontWeight: 700, color: CF.dim }}>
                  {r.phase}
                </div>
                <div>
                  <div style={{ fontFamily: CF.display, fontSize: 15, fontWeight: 600, color: CF.text, marginBottom: 4 }}>
                    {r.what}
                  </div>
                  <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim, lineHeight: 1.5 }}>
                    {r.detail}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tx hash={r.tx} label={r.label} network={r.net} />
                  <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dimmer, marginTop: 4 }}>
                    {r.net === 'mainnet' ? 'Base mainnet' : 'Base Sepolia'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── tracks ── */}
        <Section eyebrow="Hackathon tracks" title="Four tracks targeted, all four with receipts.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {TRACKS.map((t) => (
              <div key={t.name} style={{
                padding: '20px 22px', background: CF.panel,
                border: `1px solid ${CF.edge}`, borderRadius: 10, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5,
                  background: t.color, boxShadow: `0 0 10px ${t.color}`,
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ fontFamily: CF.display, fontSize: 17, fontWeight: 600, color: CF.text }}>
                    Best {t.name}
                  </div>
                  <div style={{ fontFamily: CF.mono, fontSize: 13, color: t.color, fontWeight: 600 }}>
                    {t.prize}
                  </div>
                </div>
                <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim, lineHeight: 1.5 }}>
                  {t.what}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── run it ── */}
        <Section eyebrow="Run it yourself" title="The duel in 7 commands.">
          <div style={{ background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 10, overflow: 'hidden' }}>
            <pre style={{
              margin: 0, padding: '22px 26px', fontFamily: CF.mono, fontSize: 13,
              lineHeight: 1.8, color: CF.text, overflow: 'auto',
              background: 'transparent',
            }}>
{`git clone https://github.com/neromtoobad/crossfire.git && cd crossfire
npm install && cd contracts && forge build && cd ..
cp .env.example .env.local              `}<span style={{ color: CF.dim }}>{`# fill in Venice / 1Shot keys + EOAs`}</span>{`

npm run check:accounts                  `}<span style={{ color: CF.dim }}>{`# wallet check`}</span>{`
npm run proof                           `}<span style={{ color: CF.dim }}>{`# the revert demo (the hero shot)`}</span>{`
npm run duel                            `}<span style={{ color: CF.dim }}>{`# full duel with net bet placement`}</span>{`
npm run relay:bet                       `}<span style={{ color: CF.dim }}>{`# the real Base-mainnet 1Shot relay`}</span>
            </pre>
          </div>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a href="/dashboard" style={ctaPrimaryStyle()}>
              Open the live dashboard <span style={{ color: CF.bull, marginLeft: 4 }}>→</span>
            </a>
          </div>
        </Section>

        {/* ── footer ── */}
        <footer style={{
          marginTop: 30, paddingTop: 26, borderTop: `1px solid ${CF.edge}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <LogoMark size={18} />
            <span style={{ fontFamily: CF.mono, fontSize: 11.5, color: CF.dim, letterSpacing: 0.5 }}>
              no code stops this · the chain does
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18, fontFamily: CF.mono, fontSize: 12 }}>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" style={{ color: CF.dim, textDecoration: 'none' }}>GitHub</a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/PROOF.md" target="_blank" rel="noreferrer" style={{ color: CF.dim, textDecoration: 'none' }}>PROOF.md</a>
            <a href="https://github.com/neromtoobad/crossfire/blob/main/CLAUDE.md" target="_blank" rel="noreferrer" style={{ color: CF.dim, textDecoration: 'none' }}>Brief</a>
            <a href="/dashboard" style={{ color: CF.bull, textDecoration: 'none' }}>Dashboard →</a>
          </div>
        </footer>
      </div>
    </main>
  )
}

// ── small helpers ────────────────────────────────────────────────────────
function navLinkStyle(primary = false): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 7, textDecoration: 'none',
    fontFamily: CF.mono, fontSize: 12, letterSpacing: 0.3,
    border: primary ? `1px solid color-mix(in oklab, ${CF.bull} 36%, transparent)` : `1px solid ${CF.edge}`,
    background: primary ? `color-mix(in oklab, ${CF.bull} 10%, transparent)` : 'transparent',
    color: primary ? CF.bull : CF.dim,
  }
}

function ctaPrimaryStyle(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '14px 22px', borderRadius: 9, textDecoration: 'none',
    background: CF.text, color: CF.black,
    fontFamily: CF.display, fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
    boxShadow: '0 0 30px color-mix(in oklab, #fff 20%, transparent)',
  }
}

function ctaSecondaryStyle(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '14px 22px', borderRadius: 9, textDecoration: 'none',
    border: `1px solid ${CF.edge}`, color: CF.dim,
    fontFamily: CF.display, fontSize: 14, fontWeight: 500, letterSpacing: 0.2,
  }
}

function MarketCard({ m }: { m: MarketLive }) {
  const yesPct = Math.round(m.impliedProbYes * 100)
  const totalUsdc = parseFloat(m.totalLiquidityUsdc)
  const isYesFavoured = m.impliedProbYes >= 0.5
  const lead = isYesFavoured ? CF.bull : CF.bear
  return (
    <a href={`/market/${m.id}`} style={{
      display: 'block', padding: '22px 22px 20px',
      background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
      textDecoration: 'none', color: CF.text, position: 'relative', overflow: 'hidden',
      transition: 'border-color 120ms, transform 120ms',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5,
        background: lead, boxShadow: `0 0 10px ${lead}`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ fontFamily: CF.display, fontSize: 16, fontWeight: 600, color: CF.text, lineHeight: 1.4, paddingRight: 12, flex: 1 }}>
          {m.title}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: CF.mono, fontSize: 22, fontWeight: 600, color: lead, letterSpacing: -0.5 }}>
            {yesPct}<span style={{ fontSize: 14, color: CF.dim }}>%</span>
          </div>
          <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dim, letterSpacing: 1, marginTop: 2 }}>P(YES)</div>
        </div>
      </div>
      {/* YES/NO bar */}
      <div style={{ height: 6, background: CF.edge, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
        <div style={{ width: `${yesPct}%`, background: CF.bull, boxShadow: `0 0 6px ${CF.bull}` }} />
        <div style={{ width: `${100 - yesPct}%`, background: CF.bear, boxShadow: `0 0 6px ${CF.bear}` }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: CF.mono, fontSize: 11, color: CF.dim,
      }}>
        <span>YES <span style={{ color: CF.bull }}>{m.totalYes}</span> · NO <span style={{ color: CF.bear }}>{m.totalNo}</span> USDC</span>
        <span style={{ color: lead, fontFamily: CF.display, fontWeight: 600, fontSize: 12 }}>
          Send agents →
        </span>
      </div>
      <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dimmer, marginTop: 8 }}>
        closes in {m.hoursUntilClose}h · {m.address.slice(0, 6)}…{m.address.slice(-4)}
      </div>
    </a>
  )
}

function Step({
  n,
  color,
  title,
  body,
}: {
  n: string
  color: string
  title: string
  body: React.ReactNode
}) {
  return (
    <div style={{
      padding: '24px 22px', background: CF.panel,
      border: `1px solid ${CF.edge}`, borderRadius: 10,
    }}>
      <div style={{
        fontFamily: CF.mono, fontSize: 11, letterSpacing: 1.8, color: color, marginBottom: 14,
      }}>{n}</div>
      <div style={{
        fontFamily: CF.display, fontSize: 19, fontWeight: 600, color: CF.text, marginBottom: 12,
      }}>{title}</div>
      <div style={{
        fontFamily: CF.display, fontSize: 13.5, color: CF.dim, lineHeight: 1.6,
      }}>{body}</div>
    </div>
  )
}
