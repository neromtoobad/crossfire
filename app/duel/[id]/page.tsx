// /duel/[id] — run the duel against the user's signed mandate for this market.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMarketMeta } from '../../../lib/markets-data.js'
import { RunDuel } from '../../../components/RunDuel'
import { ConnectButton } from '../../../components/ConnectButton'

export const dynamic = 'force-dynamic'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
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

export default async function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meta = getMarketMeta(id)
  if (!meta) notFound()

  return (
    <main style={{ background: CF.bg, color: CF.text, minHeight: '100vh', padding: '0 32px 60px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
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
            <Link href={`/market/${id}`} style={navLink()}>← market</Link>
            <Link href="/" style={navLink()}>dashboard</Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        <section style={{ padding: '30px 0 14px' }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, letterSpacing: 2, color: CF.dim, marginBottom: 10 }}>
            DUEL · {id.toUpperCase().replace(/-/g, ' ')}
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 30, lineHeight: 1.18,
            letterSpacing: -0.5, margin: 0, color: CF.text,
          }}>
            {meta.title}
          </h1>
          <p style={{ fontFamily: CF.display, fontSize: 14, color: CF.dim, lineHeight: 1.6, marginTop: 14 }}>
            Press <span style={{ color: CF.text }}>Run the duel</span> to send the agents. They'll buy
            evidence with real USDC drawn from your wallet through the mandate, reason with Venice,
            and either place a net bet or honestly abstain.
          </p>
        </section>

        <section style={{ marginTop: 20 }}>
          {/* RunDuel reads the user's active mandate via the connected wallet
              address and streams server-side duel progress. */}
          <RunDuel marketId={meta.id} marketTitle={meta.title} capUsdc={20 /* shown only; real cap is from the signed mandate */} />
        </section>
      </div>
    </main>
  )
}

function navLink(): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 7, textDecoration: 'none',
    fontFamily: CF.mono, fontSize: 12, letterSpacing: 0.3,
    border: `1px solid ${CF.edge}`, color: CF.dim,
  }
}
