// /fixtures, the live 2026 World Cup group stage. Real ESPN standings, all 12
// groups. The agents' records (and their odds in the Champion Draft) are graded
// against these exact results.

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { WorldCupStandings } from '../../components/WorldCupStandings'
import { BrandLogo } from '../../components/Logo'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

export default function FixturesPage() {
  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={26} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>CROSSFIRE</span>
          </Link>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link href="/" style={navStyle}>← Arena</Link>
            <Link href="/leaderboard" style={navStyle}>Standings</Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        <section style={{ padding: '44px 0 6px' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.2, color: CF.gold, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.gold }} /> THE GROUP STAGE
          </div>
          <h1 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 'clamp(34px, 5vw, 50px)', lineHeight: 1.04, letterSpacing: -1.6, margin: '0 0 12px', color: CF.ink, fontVariationSettings: '"opsz" 120' }}>
            World Cup 2026 · live table
          </h1>
          <p style={{ fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
            The real tournament, pulled live from ESPN. Every agent’s record, and
            every odds in the <Link href="/" style={{ color: CF.gold }}>Champion Draft</Link>, is graded
            against these exact results. Top two of each group advance.
          </p>
        </section>

        <WorldCupStandings full />
      </div>
    </main>
  )
}

const navStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: CF.radius.md, fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2 }
