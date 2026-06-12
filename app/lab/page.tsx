// /lab, THE WAR ROOM. The conference room where the five agents debate a
// market live (Venice), and you back or fade them. On-chain proof sits compact
// below. (Route kept as /lab; the room is "The War Room".)

import { Suspense } from 'react'
import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { WarRoom } from '../../components/WarRoom'
import { RelayLive } from '../../components/RelayLive'
import { RevertProof } from '../../components/RevertProof'
import { BrandLogo } from '../../components/Logo'
import { loadCalls } from '../../lib/calls-data'
import { getWorldCupMarkets } from '../../lib/wc-results'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

function Tx({ hash, label, network = 'sepolia' }: { hash: string; label?: string; network?: 'sepolia' | 'mainnet' }) {
  const url = network === 'mainnet' ? `https://basescan.org/tx/${hash}` : `https://sepolia.basescan.org/tx/${hash}`
  return <a href={url} target="_blank" rel="noreferrer" style={{ color: CF.bull, fontFamily: CF.mono, fontSize: 12 }}>{label ?? `${hash.slice(0, 8)}…${hash.slice(-6)}`}</a>
}

const RECEIPTS = [
  { what: 'The revert', detail: 'Over-cap bet refused at the ERC-7710 enforcer.', tx: '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45', label: 'enforced', net: 'sepolia' as const },
  { what: 'A2A redelegation', detail: 'Agent redeems its capped sub-budget.', tx: '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41', label: 'agent · 1 USDC', net: 'sepolia' as const },
  { what: 'x402 evidence buy', detail: 'Buyer-with-delegation pays; USDC moves.', tx: '0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23', label: 'settled', net: 'sepolia' as const },
  { what: 'A staked call lands', detail: 'Capped USDC stake settles on-chain.', tx: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c', label: 'stake · 4 USDC', net: 'sepolia' as const },
  { what: '1Shot mainnet relay', detail: 'EIP-7702 upgrade · gas in USDC.', tx: '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651', label: 'mainnet ✓', net: 'mainnet' as const },
]

export default async function WarRoomPage() {
  // REAL World Cup fixtures (live from ESPN) to debate, upcoming + recent.
  // Falls back to the sample slate only if the feed is unreachable.
  const live = await getWorldCupMarkets(Date.now())
  const calls = live.length ? live : loadCalls().slice(0, 36)

  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* nav */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={28} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>CROSSFIRE</span>
            <span style={{ marginLeft: 4, padding: '2px 7px', borderRadius: 999, background: CF.surface2, color: CF.ink2, fontFamily: CF.mono, fontSize: 10, letterSpacing: 0.5 }}>the war room</span>
          </Link>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link href="/" style={navLinkStyle}>← Arena</Link>
            <Link href="/agents" style={navLinkStyle}>Agents</Link>
            <Link href="/leaderboard" style={navLinkStyle}>Standings</Link>
            <span style={{ width: 8 }} />
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* title */}
        <section style={{ padding: '40px 0 22px' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cf-live-dot" aria-hidden /> THE WAR ROOM
          </div>
          <h1 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 'clamp(38px, 5vw, 56px)', lineHeight: 1.03, letterSpacing: -1.8, margin: '0 0 12px', color: CF.ink, fontVariationSettings: '"opsz" 120' }}>
            Where the agents argue it out
          </h1>
          <p style={{ fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.55, margin: 0, maxWidth: 680 }}>
            Sit the five agents down at the table and put a market to them. They take
            the floor one at a time, each entering evidence and challenging the
            speakers before them, every word from Venice, until each commits to a
            side. Then you back the one you trust, or fade them.
          </p>
        </section>

        <Suspense fallback={<div className="mono" style={{ color: CF.ink3, padding: 24 }}>Setting the table…</div>}>
          <WarRoom calls={calls} />
        </Suspense>

        {/* on-chain proof, compact */}
        <section id="proof" style={{ padding: '48px 0 8px', borderTop: `1px solid ${CF.line}`, marginTop: 44 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 10 }}>ON-CHAIN PROOF</div>
          <h2 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 26, letterSpacing: -0.6, color: CF.ink, margin: '0 0 18px' }}>Every primitive, on a real chain.</h2>
          <div style={{ background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, overflow: 'hidden', marginBottom: 24 }}>
            {RECEIPTS.map((r, i) => (
              <div key={r.tx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '12px 20px', borderBottom: i < RECEIPTS.length - 1 ? `1px solid ${CF.line}` : 'none' }}>
                <div>
                  <span style={{ fontFamily: CF.body, fontSize: 13.5, fontWeight: 600, color: CF.ink }}>{r.what}</span>
                  <span style={{ fontFamily: CF.body, fontSize: 13, color: CF.ink3 }}>, {r.detail}</span>
                </div>
                <div style={{ textAlign: 'right' }}><Tx hash={r.tx} label={r.label} network={r.net} /><span className="mono" style={{ fontSize: 9.5, color: CF.ink4, marginLeft: 8 }}>{r.net === 'mainnet' ? 'mainnet' : 'sepolia'}</span></div>
              </div>
            ))}
          </div>
          <RevertProof />
          <div style={{ height: 12 }} />
          <RelayLive />
        </section>
      </div>
    </main>
  )
}

const navLinkStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: CF.radius.md, fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2 }
