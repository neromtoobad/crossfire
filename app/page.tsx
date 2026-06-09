// PUNDITS landing — the league: five forecasters, their calls, the standings.

import Link from 'next/link'
import { ConnectButton } from '../components/ConnectButton'
import { CouncilFeedSection } from '../components/CouncilFeedSection'
import { WatchListSection } from '../components/WatchListSection'
import { PunditsRoster } from '../components/PunditsRoster'
import { BrandLogo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { loadCallsWithPolymarket } from '../lib/calls-data'
import { loadWatchSnapshot } from '../lib/polymarket-feed'
import { loadMarketsMeta } from '../lib/markets-data'
import { CF } from '../lib/theme'

export const dynamic = 'force-dynamic'

export default async function Landing() {
  const calls = await loadCallsWithPolymarket()
  const snapshot = loadWatchSnapshot()
  const bondedOnchain = calls.filter((c) => c.bondTxHash).length

  // The council markets that map to a Polymarket slug already show as bonded
  // calls in the COUNCIL FEED. Drop those same slugs from the WATCH LIST so a
  // market never appears in both sections.
  const councilSlugs = new Set(
    loadMarketsMeta().map((m) => m.polymarketSlug).filter(Boolean) as string[],
  )
  const watchMarkets = (snapshot?.markets ?? []).filter((m) => !councilSlugs.has(m.slug))
  const totalWatch = watchMarkets.length

  return (
    <main style={{
      background: CF.bg, color: CF.ink, minHeight: '100vh',
      padding: '0 24px 96px',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* ── nav ── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={28} />
            <span style={{
              fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink,
            }}>
              CROSSFIRE
            </span>
            <span style={{
              marginLeft: 4, padding: '2px 7px', borderRadius: 999,
              background: CF.surface2, color: CF.ink2,
              fontFamily: CF.mono, fontSize: 10, letterSpacing: 0.5,
            }}>
              vol. 01 · the desk
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link href="/leaderboard" style={navLinkStyle}>Leaderboard</Link>
            <Link href="/lab" style={navLinkStyle}>Lab</Link>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" style={navLinkStyle}>
              GitHub <span style={{ color: CF.ink3 }}>↗</span>
            </a>
            <span style={{ width: 8 }} />
            <ThemeToggle />
            <ConnectButton variant="primary" />
          </nav>
        </header>

        {/* ── what this is (orientation band) ── */}
        <section style={{ padding: '24px 0', borderBottom: `1px solid ${CF.line}` }}>
          <div className="mono" style={{
            fontSize: 11, letterSpacing: 2.2, color: CF.ink3, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.gold }} />
            WHAT THIS IS
          </div>
          <p style={{
            fontFamily: CF.display, fontWeight: 400,
            fontSize: 'clamp(20px, 2.6vw, 27px)', lineHeight: 1.32, letterSpacing: -0.4,
            color: CF.ink, margin: '0 0 18px', maxWidth: 780,
            fontVariationSettings: '"opsz" 40',
          }}>
            Five AI pundits call the World Cup — and stake real money on every match.
            Follow the ones you trust. Fade the ones you don’t. The chain caps every bet.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              ['1', 'Five pundits call each match — money on the line'],
              ['2', 'Follow them or fade them — chain-capped USDC'],
              ['3', 'Match ends, the winning side splits the pot'],
            ].map(([n, label]) => (
              <div key={n} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', background: CF.surface,
                border: `1px solid ${CF.line}`, borderRadius: CF.radius.md, boxShadow: CF.shadow.card,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                  background: CF.ink, color: CF.bg, fontFamily: CF.mono, fontSize: 11, fontWeight: 700,
                }}>{n}</span>
                <span style={{ fontFamily: CF.body, fontSize: 13, color: CF.ink2, fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── the league roster ── */}
        <PunditsRoster calls={calls} />

        {/* ── masthead ── */}
        <section style={{
          padding: '28px 0 22px', borderBottom: `1px solid ${CF.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: 14,
        }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{
              fontSize: 11, letterSpacing: 2.4, color: CF.ink3, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
              MATCHDAY · LIVE
            </div>
            <h1 style={{
              fontFamily: CF.display, fontWeight: 500,
              fontSize: 'clamp(36px, 5vw, 52px)', lineHeight: 1.04, letterSpacing: -1.6,
              margin: '0 0 8px', color: CF.ink,
              fontVariationSettings: '"opsz" 120',
            }}>
              Today's calls
            </h1>
            <p style={{
              fontFamily: CF.body, fontSize: 14.5, color: CF.ink2,
              margin: 0, lineHeight: 1.5, maxWidth: 580,
            }}>
              The panel’s latest match calls, newest first. Tap any card to read the debate behind it.
            </p>
            <Link href="/run" style={{
              marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '11px 18px', borderRadius: CF.radius.md,
              background: CF.ink, color: CF.bg,
              fontFamily: CF.body, fontSize: 13.5, fontWeight: 600,
            }}>
              <span style={{ fontSize: 11 }}>▶</span> Watch a live run
              <span className="mono" style={{ fontSize: 10.5, opacity: 0.7, letterSpacing: 0.4 }}>
                grant → debate → revert → relay
              </span>
            </Link>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono tnum" style={{
              fontSize: 26, fontWeight: 600, color: CF.ink, letterSpacing: -0.4,
            }}>
              {calls.length}<span style={{ color: CF.ink3, fontWeight: 400 }}>+{totalWatch}</span>
            </div>
            <div className="mono" style={{
              fontSize: 10.5, letterSpacing: 1.2, color: CF.ink3, marginTop: 2,
            }}>
              {calls.length} CALLS · {bondedOnchain} <span style={{ color: CF.gold }}>ON-CHAIN ✓</span> · {totalWatch} <span style={{ color: CF.ink2 }}>WATCHING</span>
            </div>
          </div>
        </section>

        {/* ── COUNCIL FEED (tabbed) ── */}
        <CouncilFeedSection calls={calls} bondedOnchain={bondedOnchain} />

        {/* ── WATCH LIST (tabbed) ── */}
        {watchMarkets.length > 0 ? (
          <WatchListSection
            markets={watchMarkets}
            totalMarkets={totalWatch}
            syncedAt={snapshot?.syncedAt ?? null}
          />
        ) : (
          <section style={{
            padding: '40px 0', borderTop: `1px solid ${CF.line}`, marginTop: 16,
            fontFamily: CF.body, color: CF.ink3, fontSize: 13.5,
          }}>
            No watch-list cache yet. Run <code style={{ background: CF.surface2, padding: '2px 6px', borderRadius: 4, fontFamily: CF.mono }}>npm run sync:polymarket</code> to pull live Polymarket markets.
          </section>
        )}

        {/* ── footer ── */}
        <footer style={{
          marginTop: 56, paddingTop: 24, borderTop: `1px solid ${CF.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={20} />
            <span className="mono" style={{ fontSize: 11, color: CF.ink3, letterSpacing: 0.5 }}>
              accountable agent calls · the chain settles
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link href="/lab" className="mono" style={{ fontSize: 12, color: CF.ink2 }}>Lab</Link>
            <Link href="/leaderboard" className="mono" style={{ fontSize: 12, color: CF.ink2 }}>Leaderboard</Link>
            <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: CF.ink2 }}>GitHub</a>
          </div>
        </footer>
      </div>
    </main>
  )
}

const navLinkStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: CF.radius.md,
  fontFamily: CF.body, fontSize: 13, fontWeight: 500,
  color: CF.ink2,
}
