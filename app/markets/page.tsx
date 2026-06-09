// /markets — the full market feed (all 82 World Cup markets + fixtures, tabbed).
// Renders in the arena dark/gold theme via the CF tokens. This is where the
// landing's "VIEW ALL MARKETS" lands.

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { CouncilFeedSection } from '../../components/CouncilFeedSection'
import { BrandLogo } from '../../components/Logo'
import { loadCallsWithPolymarket } from '../../lib/calls-data'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

export default async function Markets() {
  const calls = await loadCallsWithPolymarket()
  const bondedOnchain = calls.filter((c) => c.bondTxHash).length

  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 80px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* nav */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={26} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>
              CROSSFIRE
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link href="/" style={navStyle}>← Arena</Link>
            <Link href="/leaderboard" style={navStyle}>Standings</Link>
            <Link href="/lab" style={navStyle}>Lab</Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* title */}
        <section style={{ padding: '40px 0 8px' }}>
          <div className="mono" style={{
            fontSize: 11, letterSpacing: 2.4, color: CF.gold, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span className="cf-live-dot" aria-hidden /> ALL MARKETS · WORLD CUP ’26
          </div>
          <h1 style={{
            fontFamily: CF.display, fontWeight: 500,
            fontSize: 'clamp(36px, 5vw, 52px)', lineHeight: 1.04, letterSpacing: -1.6,
            margin: '0 0 10px', color: CF.ink,
            fontVariationSettings: '"opsz" 120',
          }}>
            Every match. Every call.
          </h1>
          <p style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink2, lineHeight: 1.55, maxWidth: 620, margin: 0 }}>
            All the fixtures the five agents are calling. Fade or follow any of them —
            filter by stage, or jump to live matches and settled results.
          </p>
        </section>

        <CouncilFeedSection calls={calls} bondedOnchain={bondedOnchain} />
      </div>
    </main>
  )
}

const navStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: CF.radius.md,
  fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2,
}
