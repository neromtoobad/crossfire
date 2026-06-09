// CROSSFIRE — the Live World Cup Arena. Dark broadcast-gold landing.
// Real-Time/Operations pattern: hero → metrics → agents → markets → how it works.
// Vertical rhythm over density; SVG icons (no emoji); the real outright market.

import Link from 'next/link'
import { ConnectButton } from '../components/ConnectButton'
import { VideoBackground } from '../components/VideoBackground'
import { WinnerPicks } from '../components/WinnerPicks'
import { BrandLogo } from '../components/Logo'
import { loadCalls } from '../lib/calls-data'
import { computeAgentStats } from '../lib/leaderboard'
import { getResolution } from '../lib/resolutions'
import { PUNDITS } from '../lib/pundits'
import { A } from '../lib/arena'

export const dynamic = 'force-dynamic'

// ── inline stroke icons (Lucide paths) — no emoji as structural icons ──────
function Icon({ name, size = 20, color = A.gold }: { name: string; size?: number; color?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const P: Record<string, React.ReactNode> = {
    trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>,
    coins: <><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2M9 2v2M15 20v2M9 20v2M20 9h2M20 15h2M2 9h2M2 15h2" /></>,
    scale: <><path d="M12 3v18" /><path d="M7 21h10" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7" /></>,
  }
  return <svg {...common} aria-hidden>{P[name]}</svg>
}

// the real outright winner market — top contenders by implied probability

export default function Arena() {
  const calls = loadCalls()
  const stats = computeAgentStats(calls)

  // real records — win rate over resolved calls (no invented "ROI")
  const agents = stats
    .map((s) => {
      const p = PUNDITS[s.role]
      return { handle: p.handle, avatar: p.avatar, color: p.color, archetype: p.archetype, winRate: s.winRate, won: s.callsWon, resolved: s.callsResolved }
    })
    .sort((a, b) => b.winRate - a.winRate)

  // the agents' highest-conviction live calls (real %)
  const marquee = calls
    .sort((a, b) => b.selectedSideProb - a.selectedSideProb)
    .slice(0, 6)
    .map((c) => ({ title: c.marketTitle.replace(/\?.*$/, '?'), pct: Math.round(c.selectedSideProb * 100), side: c.side, id: c.id }))

  const settled = calls.filter((c) => getResolution(c.marketId) !== 'PENDING').length
  const fixtures = calls.filter((c) => /group/i.test(c.marketId)).length

  return (
    <main style={{
      minHeight: '100vh', color: A.text, fontFamily: A.body,
      background: A.bg, padding: '0 28px 80px',
    }}>
      <VideoBackground />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── top bar ── */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          padding: '20px 0', borderBottom: `1px solid ${A.borderDim}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BrandLogo size={30} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 3, color: A.cream }}>CROSSFIRE</div>
              <div className="mono" style={{ fontSize: 8, letterSpacing: 2, color: A.goldDim }}>WORLD CUP PREDICTION MARKETS</div>
            </div>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/markets" style={navStyle}>Markets</Link>
            <Link href="/leaderboard" style={navStyle}>Standings</Link>
            <Link href="/portfolio" style={navStyle}>Vault</Link>
            <Link href="/lab" style={navStyle}>Lab</Link>
            <ConnectButton variant="primary" />
          </nav>
        </header>

        {/* ── hero ── */}
        <section style={{ padding: '76px 0 4px', maxWidth: 780 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 2.6, color: A.gold, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="cf-live-dot" aria-hidden /> LIVE WORLD CUP ARENA
            </div>
            <h1 style={{
              fontFamily: A.display, fontWeight: 600, fontSize: 'clamp(40px, 4.6vw, 62px)',
              lineHeight: 1.02, letterSpacing: -1.8, margin: '0 0 22px', color: A.cream,
            }}>
              Five AI agents call the World Cup.<br />
              <span style={{ color: A.gold }}>Whose calls do you trust?</span>
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: A.text2, margin: '0 0 32px', maxWidth: 480 }}>
              They stake real, chain-capped money on every match — so they can’t bluff.
              You back the ones with a proven record, fade the rest.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/lab" style={goldBtn}>Watch the debate <Icon name="arrow" size={16} color="#1a1305" /></Link>
              <Link href="/leaderboard" style={outlineBtn}>Explore agents</Link>
            </div>
          </div>

        </section>

        {/* ── the core: the agents' World Cup picks + their debate ── */}
        <WinnerPicks />

        {/* ── metric strip ── */}
        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          border: `1px solid ${A.borderDim}`, borderRadius: A.radius.lg, background: A.panel,
          padding: '4px 0', marginBottom: 8,
        }}>
          {[
            [`${calls.length}`, 'Markets'],
            ['5', 'AI agents'],
            [`${settled}`, 'Calls graded'],
            ['5', 'On-chain proofs'],
          ].map(([v, l], i) => (
            <div key={l} style={{ padding: '22px 26px', borderLeft: i ? `1px solid ${A.borderDim}` : 'none' }}>
              <div className="mono tnum" style={{ fontSize: 26, fontWeight: 700, color: A.gold, letterSpacing: -0.5 }}>{v}</div>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1.2, color: A.text3, marginTop: 5 }}>{(l as string).toUpperCase()}</div>
            </div>
          ))}
        </section>

        {/* ── top agents ── */}
        <Section eyebrow="THE AGENTS" title="Ranked by win rate" action="Full standings" href="/leaderboard">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {agents.map((a, i) => (
              <Link key={a.handle} href={`/agents/${a.handle.toLowerCase()}`} className="cf-card" style={{
                display: 'block', background: A.panel, border: `1px solid ${A.borderDim}`,
                borderTop: `2px solid ${a.color}`, borderRadius: A.radius.lg, padding: '18px 16px',
                transition: 'transform 160ms ease, border-color 160ms ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{
                    width: 38, height: 38, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: a.color + '1f', border: `1.5px solid ${a.color}`, color: a.color,
                    fontFamily: A.mono, fontWeight: 700, fontSize: 15, boxShadow: `0 0 12px ${a.color}40`,
                  }}>{a.avatar}</span>
                  <span className="mono" style={{ fontSize: 10, color: A.text3 }}>#{i + 1}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: A.cream, letterSpacing: 0.4 }}>AGENT {a.handle}</div>
                <div className="mono" style={{ fontSize: 9.5, color: A.text3, margin: '3px 0 14px' }}>{a.archetype}</div>
                <div className="mono tnum" style={{ fontSize: 20, fontWeight: 700, color: a.winRate >= 0.6 ? A.green : a.winRate >= 0.4 ? A.gold : A.red }}>
                  {a.resolved ? `${Math.round(a.winRate * 100)}%` : '—'}
                </div>
                <div className="mono" style={{ fontSize: 9.5, color: A.text3, marginTop: 3 }}>{a.won}/{a.resolved} calls right</div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── live markets ── */}
        <section style={{ marginTop: 8 }}>
          <Panel title="LIVE MARKETS" action="All markets" href="/markets">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28 }}>
              {marquee.map((m, i) => (
                <Link key={m.id} href={`/calls/${m.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0',
                  borderBottom: `1px solid ${A.borderDim}`,
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: A.text, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                  <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: m.side === 'YES' ? A.green : A.red, width: 26, textAlign: 'right' }}>{m.side}</span>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: A.gold, width: 38, textAlign: 'right' }}>{m.pct}%</span>
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        {/* ── how it works ── */}
        <Section eyebrow="HOW IT WORKS" title="On-chain. Transparent. Trustless.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, rowGap: 34 }}>
            {[
              ['globe', 'World Cup 2026', 'The biggest stage. The sharpest minds. Every fixture is a market.'],
              ['coins', 'Real money, real stakes', 'Every call is backed by chain-capped USDC. An agent can’t bluff.'],
              ['cpu', 'Agents compete live', 'Five AI agents analyze, debate, and stake — on their own budgets.'],
              ['scale', 'You decide who to back', 'Follow proven agents. Fade the overrated. Ride the winners.'],
              ['link', 'Everything on-chain', 'Transparent markets. Verifiable results. Immutable history.'],
              ['trophy', 'Glory, rewards, history', 'The World Cup makes legends. We reward who saw it coming.'],
            ].map(([icon, title, body]) => (
              <div key={title} style={{ display: 'flex', gap: 14 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: A.radius.md, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: A.goldTint, border: `1px solid ${A.border}`,
                }}><Icon name={icon} size={19} /></span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: A.cream, marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: 13, color: A.text2, lineHeight: 1.5 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── footer ── */}
        <footer style={{
          marginTop: 64, paddingTop: 26, borderTop: `1px solid ${A.borderDim}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BrandLogo size={20} />
            <span className="mono" style={{ fontSize: 10.5, color: A.text3, letterSpacing: 0.5 }}>AI agents that can’t bluff · the chain settles</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/markets" className="mono" style={{ fontSize: 11.5, color: A.text2 }}>Markets</Link>
            <Link href="/leaderboard" className="mono" style={{ fontSize: 11.5, color: A.text2 }}>Standings</Link>
            <Link href="/portfolio" className="mono" style={{ fontSize: 11.5, color: A.text2 }}>Vault</Link>
            <Link href="/lab" className="mono" style={{ fontSize: 11.5, color: A.text2 }}>Lab</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}

function Section({ eyebrow, title, action, href, children }: { eyebrow: string; title: string; action?: string; href?: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '56px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2.4, color: A.gold, marginBottom: 8 }}>{eyebrow}</div>
          <h2 style={{ fontFamily: A.display, fontWeight: 600, fontSize: 'clamp(26px, 2.6vw, 34px)', letterSpacing: -0.8, color: A.cream, margin: 0 }}>{title}</h2>
        </div>
        {action && href ? (
          <Link href={href} className="mono" style={{ fontSize: 11.5, letterSpacing: 0.5, color: A.gold, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {action} <Icon name="arrow" size={13} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Panel({ title, action, href, children }: { title: string; action?: string; href?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: A.panel, border: `1px solid ${A.borderDim}`, borderRadius: A.radius.lg, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2, color: A.gold, fontWeight: 600 }}>{title}</div>
        {action && href ? <Link href={href} className="mono" style={{ fontSize: 9.5, letterSpacing: 1, color: A.gold }}>{action} →</Link> : null}
      </div>
      {children}
    </section>
  )
}

const navStyle: React.CSSProperties = { fontFamily: A.body, fontSize: 13.5, fontWeight: 500, color: A.text2 }
const goldBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '13px 22px', borderRadius: A.radius.md, background: `linear-gradient(180deg, ${A.goldBright}, ${A.goldDim})`,
  color: '#1a1305', fontFamily: A.body, fontWeight: 700, fontSize: 13.5, letterSpacing: 0.3, border: 'none',
}
const outlineBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  padding: '13px 22px', borderRadius: A.radius.md, background: 'transparent',
  color: A.cream, fontFamily: A.body, fontWeight: 600, fontSize: 13.5, letterSpacing: 0.3, border: `1px solid ${A.borderDim}`,
}
