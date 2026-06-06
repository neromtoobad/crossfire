// /market/[id] — picks a market, shows live state, hosts the Grant Mandate flow.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GrantMandate } from '../../../components/GrantMandate'
import { ConnectButton } from '../../../components/ConnectButton'
import { getMarketMeta, readMarketLive } from '../../../lib/markets-data.js'

export const dynamic = 'force-dynamic'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

function LogoMark({ size = 28 }: { size?: number }) {
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

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meta = getMarketMeta(id)
  if (!meta) notFound()

  const live = await readMarketLive(meta)
  const yesPct = Math.round(live.impliedProbYes * 100)
  const lead = live.impliedProbYes >= 0.5 ? CF.bull : CF.bear

  return (
    <main style={{ background: CF.bg, color: CF.text, minHeight: '100vh', padding: '0 32px 60px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* nav */}
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
            <Link href="/" style={navLink()}>← markets</Link>
            <Link href="/dashboard" style={navLink()}>dashboard →</Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* market header */}
        <section style={{ padding: '40px 0 24px' }}>
          <div style={{ fontFamily: CF.mono, fontSize: 11, letterSpacing: 2, color: CF.dim, marginBottom: 12 }}>
            PREDICTION MARKET · {meta.id.toUpperCase().replace(/-/g, ' ')}
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 36, lineHeight: 1.15,
            letterSpacing: -0.6, margin: '0 0 24px', color: CF.text,
          }}>
            {meta.title}
          </h1>

          {/* live state */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 28, padding: '18px 22px',
            background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
          }}>
            <div>
              <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6, marginBottom: 4 }}>P(YES)</div>
              <div style={{ fontFamily: CF.mono, fontSize: 30, fontWeight: 600, color: lead, letterSpacing: -1 }}>
                {yesPct}<span style={{ color: CF.dim, fontSize: 16 }}>%</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', height: 8, background: CF.edge, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${yesPct}%`, background: CF.bull, boxShadow: `0 0 6px ${CF.bull}` }} />
                <div style={{ width: `${100 - yesPct}%`, background: CF.bear, boxShadow: `0 0 6px ${CF.bear}` }} />
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 11.5, color: CF.dim, display: 'flex', justifyContent: 'space-between' }}>
                <span>YES <span style={{ color: CF.bull }}>{live.totalYes}</span> USDC</span>
                <span>NO <span style={{ color: CF.bear }}>{live.totalNo}</span> USDC</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: `1px solid ${CF.edge}`, paddingLeft: 22 }}>
              <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6, marginBottom: 4 }}>CLOSES IN</div>
              <div style={{ fontFamily: CF.mono, fontSize: 18, fontWeight: 600, color: CF.text }}>
                {live.hoursUntilClose}h
              </div>
            </div>
          </div>

          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dimmer, marginTop: 10 }}>
            Market contract: {meta.address} ·{' '}
            <a href={`https://sepolia.basescan.org/address/${meta.address}`} target="_blank" rel="noreferrer" style={{ color: CF.dim }}>
              Basescan ↗
            </a>
          </div>
        </section>

        {/* GRANT MANDATE — the kit-in-main-flow component */}
        <section style={{ padding: '20px 0 24px' }}>
          <GrantMandate marketId={meta.id} marketAddress={meta.address} marketTitle={meta.title} />
        </section>

        {/* explainer */}
        <section style={{
          padding: '18px 22px', background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
          marginTop: 12,
        }}>
          <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.8, marginBottom: 10 }}>
            HOW IT WORKS
          </div>
          <ol style={{ fontFamily: CF.display, fontSize: 13.5, color: CF.dim, lineHeight: 1.7, paddingLeft: 22, margin: 0 }}>
            <li>You sign one mandate above. The chain caps total spend on this market.</li>
            <li>Two adversarial agents (Bull and Bear) each get half your cap. Each buys evidence via x402 (real USDC moves) and reasons with Venice.</li>
            <li>The bet placed is the NET of their committed stakes. If they cancel out, nothing is placed.</li>
            <li>Revoke any time from the dashboard. The chain refuses further spend immediately.</li>
          </ol>
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
