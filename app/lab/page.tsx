// /lab — Proof & Receipts. The credibility console: the on-chain evidence for
// every sponsor primitive, plus the tools to run each one yourself, live.
// The narrative walkthrough lives on /run; this page is the proof.

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { RunCouncilLive } from '../../components/RunCouncilLive'
import { RelayLive } from '../../components/RelayLive'
import { RevertProof } from '../../components/RevertProof'
import { BrandLogo } from '../../components/Logo'
import { loadMarketsMeta } from '../../lib/markets-data'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

function Tx({ hash, label, network = 'sepolia' }: { hash: string; label?: string; network?: 'sepolia' | 'mainnet' }) {
  const url = network === 'mainnet'
    ? `https://basescan.org/tx/${hash}`
    : `https://sepolia.basescan.org/tx/${hash}`
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: CF.bull, fontFamily: CF.mono, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      {label ?? `${hash.slice(0, 8)}…${hash.slice(-6)}`}
    </a>
  )
}

const RECEIPTS = [
  { phase: '01', what: 'The cap holds — the revert', detail: 'An over-cap bet is refused live at the ERC-7710 caveat enforcer (ERC20TransferAmountEnforcer:allowance-exceeded). No code stops it; the chain does.', tx: '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45', label: 'enforced', net: 'sepolia' as const },
  { phase: '02', what: 'A2A — agent budget', detail: 'An agent redeems its capped sub-budget through the redelegation chain (user → arena → agent).', tx: '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41', label: 'agent · 1 USDC', net: 'sepolia' as const },
  { phase: '03', what: 'x402 — evidence buy', detail: 'An agent pays for evidence with a buyer-side delegation — real USDC moves over x402.', tx: '0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23', label: 'evidence settled', net: 'sepolia' as const },
  { phase: '04', what: 'A staked call lands', detail: 'An agent’s capped USDC stake settles on its side of a call, on-chain — the costly signal.', tx: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c', label: 'stake · 4 USDC', net: 'sepolia' as const },
  { phase: '05', what: '1Shot mainnet relay', detail: 'Confirmed (200) · EIP-7702 in-flight upgrade · gas paid in USDC, no ETH.', tx: '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651', label: 'mainnet ✓', net: 'mainnet' as const },
]

export default async function Lab() {
  // Only the World Cup markets — the arena runs on football, not the legacy
  // crypto/macro markets left over from the original duel build.
  const marketChoices = loadMarketsMeta()
    .filter((m) => m.id.startsWith('wc-'))
    .map((m) => ({ id: m.id, title: m.title }))

  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* nav */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={28} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>CROSSFIRE</span>
            <span style={{ marginLeft: 4, padding: '2px 7px', borderRadius: 999, background: CF.surface2, color: CF.ink2, fontFamily: CF.mono, fontSize: 10, letterSpacing: 0.5 }}>proof</span>
          </Link>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link href="/" style={navLinkStyle}>← Arena</Link>
            <Link href="/run" style={navLinkStyle}>Guided run</Link>
            <Link href="/leaderboard" style={navLinkStyle}>Standings</Link>
            <span style={{ width: 8 }} />
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* title */}
        <section style={{ padding: '40px 0 28px' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
            ON-CHAIN PROOF
          </div>
          <h1 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 'clamp(38px, 5vw, 54px)', lineHeight: 1.05, letterSpacing: -1.6, margin: '0 0 12px', color: CF.ink, fontVariationSettings: '"opsz" 120' }}>
            The proof
          </h1>
          <p style={{ fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.55, margin: 0, maxWidth: 680 }}>
            Every sponsor primitive — the kit, Venice, x402, 1Shot — proven on a
            real chain, each with a transaction you can open. Want the story
            first? <Link href="/run" style={{ color: CF.gold, fontWeight: 600 }}>Watch the guided run →</Link>
          </p>
        </section>

        {/* receipts — the evidence, first */}
        <section id="proof" style={{ padding: '0 0 8px' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10 }}>ON-CHAIN RECEIPTS</div>
          <h2 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 32, letterSpacing: -0.8, color: CF.ink, margin: '0 0 22px', fontVariationSettings: '"opsz" 80', maxWidth: 720 }}>
            Every primitive verified on a real chain.
          </h2>
          <div style={{ background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, overflow: 'hidden' }}>
            {RECEIPTS.map((r, i) => (
              <div key={r.phase} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 20, alignItems: 'center', padding: '16px 22px', borderBottom: i < RECEIPTS.length - 1 ? `1px solid ${CF.line}` : 'none' }}>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: CF.ink3, letterSpacing: 0.5 }}>{r.phase}</div>
                <div>
                  <div style={{ fontFamily: CF.body, fontSize: 14, fontWeight: 600, color: CF.ink, marginBottom: 4 }}>{r.what}</div>
                  <div style={{ fontFamily: CF.body, fontSize: 13, color: CF.ink2, lineHeight: 1.5 }}>{r.detail}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tx hash={r.tx} label={r.label} network={r.net} />
                  <div className="mono" style={{ fontSize: 10, color: CF.ink4, marginTop: 4, letterSpacing: 0.4 }}>
                    {r.net === 'mainnet' ? 'Base mainnet' : 'Base Sepolia'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* verify it yourself — the live ops */}
        <section style={{ padding: '44px 0 4px', borderTop: `1px solid ${CF.line}`, marginTop: 40 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10 }}>VERIFY IT YOURSELF</div>
          <h2 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 32, letterSpacing: -0.8, color: CF.ink, margin: '0 0 8px', fontVariationSettings: '"opsz" 80', maxWidth: 720 }}>
            Run each primitive, live.
          </h2>
          <p style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink2, lineHeight: 1.55, margin: '0 0 24px', maxWidth: 640 }}>
            Don’t take the receipts on faith — fire them yourself: run the agents on a
            World Cup market, relay a real 7710 tx on Base mainnet through 1Shot, and
            watch the enforcer refuse an over-cap bet.
          </p>
        </section>
        <section style={{ padding: '4px 0 8px' }}>
          <RunCouncilLive markets={marketChoices} />
        </section>
        <section style={{ padding: '6px 0 8px' }}>
          <RelayLive />
        </section>
        <section style={{ padding: '6px 0 8px' }}>
          <RevertProof />
        </section>
      </div>
    </main>
  )
}

const navLinkStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: CF.radius.md,
  fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2,
}
