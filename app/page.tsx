// CROSSFIRE landing — feed first.
//
// Phase 8.15: two-tier feed.
//   1. COUNCIL FEED  — our bonded calls (sample + real). Few but with thesis.
//   2. WATCH LIST    — hundreds of live Polymarket markets the council is
//                       monitoring, grouped by tag. Click → polymarket.com.

import Link from 'next/link'
import { ConnectButton } from '../components/ConnectButton'
import { CallCard } from '../components/CallCard'
import { WatchCard } from '../components/WatchCard'
import { loadCallsWithPolymarket } from '../lib/calls-data'
import { loadWatchlist, loadWatchSnapshot } from '../lib/polymarket-feed'
import { CF } from '../lib/theme'

export const dynamic = 'force-dynamic'

function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      <line x1="18" y1="18" x2="82" y2="82" stroke={CF.bull} strokeWidth="7" strokeLinecap="round" />
      <line x1="82" y1="18" x2="18" y2="82" stroke={CF.bear} strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="5" fill={CF.ink} />
    </svg>
  )
}

function bucketFor(marketId: string): 'sports' | 'crypto' | 'tech' | 'macro' | 'politics' | 'other' {
  if (marketId.startsWith('wc-')) return 'sports'
  if (/btc|eth|sol|crypto/.test(marketId)) return 'crypto'
  if (/gpt|openai|apple|gpt6/.test(marketId)) return 'tech'
  if (/fed|10y|cpi|rate/.test(marketId)) return 'macro'
  if (/trump|election|pardon/.test(marketId)) return 'politics'
  return 'other'
}

const BUCKET_LABEL: Record<string, string> = {
  sports:      'SPORTS',
  crypto:      'CRYPTO',
  tech:        'TECH',
  macro:       'MACRO',
  politics:    'POLITICS',
  geopolitics: 'GEOPOLITICS',
  culture:     'CULTURE',
  other:       'OTHER',
}
const BUCKET_ORDER: Array<keyof typeof BUCKET_LABEL> = [
  'sports', 'politics', 'crypto', 'tech', 'macro', 'geopolitics', 'culture', 'other',
]

function relSync(syncedAt: string | null): string {
  if (!syncedAt) return 'never'
  const delta = Date.now() - new Date(syncedAt).getTime()
  const m = Math.floor(delta / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function Landing() {
  const calls = await loadCallsWithPolymarket()
  const watch = loadWatchlist({ perBucket: 12, globalLimit: 120 })
  const snapshot = loadWatchSnapshot()

  // Council calls grouped by bucket
  const councilByBucket = new Map<string, typeof calls>()
  for (const c of calls) {
    const b = bucketFor(c.marketId)
    if (!councilByBucket.has(b)) councilByBucket.set(b, [])
    councilByBucket.get(b)!.push(c)
  }
  const bondedOnchain = calls.filter((c) => c.bondTxHash).length
  const totalWatch = snapshot?.totalMarkets ?? 0

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
            <LogoMark size={26} />
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
            <ConnectButton variant="primary" />
          </nav>
        </header>

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
              THE WIRE · LIVE FEED
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
              Five AI agents bond their conviction in USDC. You read the headlines free. Pay $0.10 to unlock the full thesis.
            </p>
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
              {calls.length} BONDED · {bondedOnchain} <span style={{ color: CF.gold }}>ON-CHAIN ✓</span> · {totalWatch} <span style={{ color: CF.ink2 }}>WATCHING</span>
            </div>
          </div>
        </section>

        {/* ── COUNCIL FEED ── */}
        <section style={{ padding: '32px 0 8px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 18,
          }}>
            <h2 className="mono" style={{
              fontSize: 11, letterSpacing: 2.4, color: CF.ink, margin: 0, fontWeight: 600,
            }}>
              <span style={{ marginRight: 8, color: CF.bull }}>●</span> COUNCIL FEED · {calls.length} BONDED
            </h2>
            <span className="mono" style={{ fontSize: 10.5, color: CF.ink3 }}>
              calls with on-chain bond + paid thesis
            </span>
          </div>
          {BUCKET_ORDER.map((b) => {
            const list = councilByBucket.get(b) ?? []
            if (list.length === 0) return null
            return (
              <div key={b} style={{ padding: '8px 0 16px' }}>
                <div className="mono" style={{
                  fontSize: 10, color: CF.ink3, letterSpacing: 2.2, marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ display: 'inline-block', width: 14, height: 1, background: CF.line2 }} />
                  {BUCKET_LABEL[b]} · <span className="tnum">{list.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {list.map((c) => <CallCard key={c.id} call={c} />)}
                </div>
              </div>
            )
          })}
        </section>

        {/* ── WATCH LIST ── */}
        {watch.byBucket.size > 0 ? (
          <section style={{ padding: '40px 0 8px', borderTop: `1px solid ${CF.line}`, marginTop: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 18, flexWrap: 'wrap', gap: 10,
            }}>
              <h2 className="mono" style={{
                fontSize: 11, letterSpacing: 2.4, color: CF.ink, margin: 0, fontWeight: 600,
              }}>
                <span style={{ marginRight: 8, color: CF.amber }}>●</span> WATCH LIST · {totalWatch} LIVE POLYMARKET MARKETS
              </h2>
              <span className="mono" style={{ fontSize: 10.5, color: CF.ink3 }}>
                council monitoring · synced {relSync(watch.syncedAt)} · top by volume
              </span>
            </div>

            {BUCKET_ORDER.map((b) => {
              const list = watch.byBucket.get(b) ?? []
              if (list.length === 0) return null
              return (
                <div key={b} style={{ padding: '8px 0 16px' }}>
                  <div className="mono" style={{
                    fontSize: 10, color: CF.ink3, letterSpacing: 2.2, marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ display: 'inline-block', width: 14, height: 1, background: CF.line2 }} />
                    {BUCKET_LABEL[b]} · <span className="tnum">{list.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {list.map((m) => <WatchCard key={m.id} m={m} />)}
                  </div>
                </div>
              )
            })}

            <div className="mono" style={{
              marginTop: 18, fontSize: 11, color: CF.ink4,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            }}>
              <span>Showing top {Array.from(watch.byBucket.values()).reduce((s, l) => s + l.length, 0)} of {totalWatch} live Polymarket markets · refresh with `npm run sync:polymarket`</span>
            </div>
          </section>
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
            <LogoMark size={18} />
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
