// /run — THE LIVE RUN. The spine: one narrated flow that stitches the working
// pieces end to end (grant → debate+bond → revert → 1Shot relay → leaderboard).
// This is the marquee demo surface; /lab stays the operator console.

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { BrandLogo } from '../../components/Logo'
import { LiveRun } from '../../components/LiveRun'
import { loadMarketsMeta } from '../../lib/markets-data'
import { CF } from '../../lib/theme'

export const dynamic = 'force-dynamic'

const navLinkStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: CF.radius.md,
  fontFamily: CF.body, fontSize: 13, color: CF.ink2, fontWeight: 500,
}

export default function RunPage() {
  const markets = loadMarketsMeta().map((m) => ({ id: m.id, title: m.title }))

  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* nav */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={28} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>
              CROSSFIRE
            </span>
            <span style={{
              marginLeft: 4, padding: '2px 7px', borderRadius: 999,
              background: CF.surface2, color: CF.ink2,
              fontFamily: CF.mono, fontSize: 10, letterSpacing: 0.5,
            }}>
              the live run
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link href="/" style={navLinkStyle}>← Feed</Link>
            <Link href="/lab" style={navLinkStyle}>Lab</Link>
            <span style={{ width: 8 }} />
            <ConnectButton variant="primary" />
          </div>
        </header>

        <LiveRun markets={markets} />
      </div>
    </main>
  )
}
