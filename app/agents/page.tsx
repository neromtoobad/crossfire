// /agents — THE AGENTS. The browsing surface: five HUD cards, each opening
// that agent's full pick sheet (every market, free one-liners, paid reasoning).

import Link from 'next/link'
import { ConnectButton } from '../../components/ConnectButton'
import { ThemeToggle } from '../../components/ThemeToggle'
import { BrandLogo } from '../../components/Logo'
import { loadCalls } from '../../lib/calls-data'
import { computeAgentStats } from '../../lib/leaderboard'
import { PUNDITS, PUNDIT_ROLES, slugOf } from '../../lib/pundits'
import { CF, alpha } from '../../lib/theme'

export const dynamic = 'force-dynamic'

export default function AgentsIndex() {
  const calls = loadCalls()
  const stats = computeAgentStats(calls)

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
            <Link href="/lab" style={navStyle}>War Room</Link>
            <ThemeToggle />
            <ConnectButton variant="primary" />
          </div>
        </header>

        <section style={{ padding: '44px 0 28px' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.4, color: CF.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cf-live-dot" aria-hidden /> THE AGENTS
          </div>
          <h1 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 'clamp(38px, 5vw, 54px)', lineHeight: 1.04, letterSpacing: -1.7, margin: '0 0 12px', color: CF.ink, fontVariationSettings: '"opsz" 120' }}>
            Pick your analyst
          </h1>
          <p style={{ fontFamily: CF.body, fontSize: 16, color: CF.ink2, lineHeight: 1.55, margin: 0, maxWidth: 640 }}>
            Five AI agents, five lanes, five track records. Open an agent to see every
            pick it has made — the headline is free, the detailed reasoning unlocks
            with a nano-payment.
          </p>
        </section>

        <div className="cf-g5 cf-stagger">
          {PUNDIT_ROLES.map((role) => {
            const p = PUNDITS[role]
            const s = stats.find((x) => x.role === role)
            const win = s && s.callsResolved > 0 ? Math.round(s.winRate * 100) : null
            return (
              <Link key={role} href={`/agents/${slugOf(role)}`} className="cf-card" style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                background: CF.surface, border: `1px solid ${alpha(p.color, 30)}`,
                borderRadius: 10, overflow: 'hidden', boxShadow: `0 0 20px ${alpha(p.color, 10)}`,
              }}>
                <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${alpha(p.color, 16)}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: CF.mono, fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: CF.ink }}>{p.handle}</span>
                    {win !== null ? <span className="mono tnum" style={{ fontSize: 12, fontWeight: 700, color: p.color, border: `1px solid ${alpha(p.color, 35)}`, borderRadius: 4, padding: '1px 6px' }}>{win}%</span> : null}
                  </div>
                  <div className="mono" style={{ fontSize: 9.5, letterSpacing: 0.8, color: p.color, marginTop: 3 }}>{p.persona}</div>
                </div>
                <div style={{ position: 'relative', aspectRatio: '4 / 3.2', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.portrait} alt={`${p.handle} — AI agent`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(4,6,10,0.88) 100%)' }} />
                </div>
                <div style={{ padding: '0 14px 14px', marginTop: -6, position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: CF.body, fontSize: 12, color: CF.ink2, lineHeight: 1.5, flex: 1 }}>{p.blurb}</div>
                  <div className="mono" style={{ marginTop: 10, fontSize: 10, color: CF.ink3 }}>
                    {s ? `${s.callsWon}/${s.callsResolved} calls right · ${s.callsTotal} picks` : '—'}
                  </div>
                  <div className="mono" style={{
                    marginTop: 10, padding: '8px 0', textAlign: 'center',
                    border: `1px solid ${alpha(p.color, 40)}`, borderRadius: 6, color: p.color,
                    fontSize: 10.5, fontWeight: 700, letterSpacing: 2, background: alpha(p.color, 6),
                  }}>
                    VIEW ALL PICKS
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}

const navStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: CF.radius.md, fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2 }
