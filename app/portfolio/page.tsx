// /portfolio — The Vault. A user's positions + chain-enforced mandates (revoke).

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { Portfolio } from '../../components/Portfolio'
import { BrandLogo } from '../../components/Logo'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

export default function PortfolioPage() {
  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={26} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>CROSSFIRE</span>
          </Link>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link href="/markets" style={navStyle}>Markets</Link>
            <Link href="/leaderboard" style={navStyle}>Standings</Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        <section style={{ padding: '48px 0 30px' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.2, color: CF.gold, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.gold }} /> THE VAULT
          </div>
          <h1 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 'clamp(38px, 5vw, 52px)', lineHeight: 1.04, letterSpacing: -1.8, margin: '0 0 12px', color: CF.ink, fontVariationSettings: '"opsz" 120' }}>
            What you’ve backed
          </h1>
          <p style={{ fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.6, maxWidth: 620, margin: 0 }}>
            Your open positions and the spending mandates you’ve granted. A mandate
            is a chain-capped limit — the agent can never spend past it, and you can
            <span style={{ color: CF.ink }}> revoke it instantly</span>.
          </p>
        </section>

        <Portfolio />
      </div>
    </main>
  )
}

const navStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: CF.radius.md, fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2 }
