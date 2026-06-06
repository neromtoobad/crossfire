'use client'

// Tabbed watch list — keeps the home page from drowning in 100+ cards.
//   default tab: "Trending" — top N across all buckets by volume
//   per-bucket tabs: "Sports", "Politics", ... — top N in that bucket
//
// The full WatchSnapshot is passed in server-side; this component just
// filters and renders locally on tab change. No network calls.

import { useMemo, useState } from 'react'
import { CF } from '../lib/theme'
import { WatchCard } from './WatchCard'
import type { WatchMarket } from '../lib/polymarket-feed'

type Tab = 'trending' | 'sports' | 'politics' | 'crypto' | 'tech' | 'macro' | 'geopolitics' | 'culture' | 'other'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'trending',    label: 'Trending' },
  { id: 'sports',      label: 'Sports' },
  { id: 'politics',    label: 'Politics' },
  { id: 'crypto',      label: 'Crypto' },
  { id: 'tech',        label: 'Tech' },
  { id: 'macro',       label: 'Macro' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'culture',     label: 'Culture' },
  { id: 'other',       label: 'Other' },
]

const TRENDING_LIMIT = 16
const PER_BUCKET_LIMIT = 24

export function WatchListSection({
  markets,
  totalMarkets,
  syncedAt,
}: {
  markets: WatchMarket[]
  totalMarkets: number
  syncedAt: string | null
}) {
  const [tab, setTab] = useState<Tab>('trending')

  // Compute counts per bucket once (memoized).
  const bucketCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of markets) m.set(x.bucket, (m.get(x.bucket) ?? 0) + 1)
    return m
  }, [markets])

  const visible = useMemo(() => {
    if (tab === 'trending') {
      // Top-N by volume across everything (markets array is already volume-desc).
      return markets.slice(0, TRENDING_LIMIT)
    }
    return markets.filter((m) => m.bucket === tab).slice(0, PER_BUCKET_LIMIT)
  }, [markets, tab])

  const totalInTab = tab === 'trending' ? markets.length : (bucketCounts.get(tab) ?? 0)
  const shownInTab = visible.length

  const sync = useMemo(() => relSync(syncedAt), [syncedAt])

  return (
    <section style={{ padding: '40px 0 8px', borderTop: `1px solid ${CF.line}`, marginTop: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 16, flexWrap: 'wrap', gap: 10,
      }}>
        <h2 className="mono" style={{
          fontSize: 11, letterSpacing: 2.4, color: CF.ink, margin: 0, fontWeight: 600,
        }}>
          <span style={{ marginRight: 8, color: CF.amber }}>●</span>
          WATCH LIST · {totalMarkets} LIVE POLYMARKET MARKETS
        </h2>
        <span className="mono" style={{ fontSize: 10.5, color: CF.ink3 }}>
          council monitoring · synced {sync}
        </span>
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="watch list categories" style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18,
        paddingBottom: 14, borderBottom: `1px solid ${CF.line}`,
      }}>
        {TABS.map((t) => {
          const active = tab === t.id
          const count = t.id === 'trending' ? markets.length : (bucketCounts.get(t.id) ?? 0)
          if (t.id !== 'trending' && count === 0) return null
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 12px', borderRadius: 999,
                background: active ? CF.ink : CF.surface,
                color: active ? CF.bg : CF.ink2,
                border: `1px solid ${active ? CF.ink : CF.line2}`,
                fontFamily: CF.body, fontSize: 12.5, fontWeight: active ? 600 : 500,
                cursor: 'pointer', letterSpacing: 0.1,
                transition: 'background 120ms ease, color 120ms ease, border 120ms ease',
              }}
            >
              {t.label}
              <span className="mono tnum" style={{
                fontSize: 10.5,
                color: active ? 'rgba(255,255,255,0.55)' : CF.ink3,
                fontWeight: 500,
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* meta strip */}
      <div className="mono" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8, marginBottom: 12,
        fontSize: 10.5, color: CF.ink3, letterSpacing: 0.4,
      }}>
        <span>
          {tab === 'trending'
            ? <>showing top <span className="tnum" style={{ color: CF.ink }}>{shownInTab}</span> trending by volume</>
            : <>showing <span className="tnum" style={{ color: CF.ink }}>{shownInTab}</span> of <span className="tnum">{totalInTab}</span> in {labelFor(tab)}</>}
        </span>
        <span style={{ color: CF.ink4 }}>click any card to open in polymarket ↗</span>
      </div>

      {/* grid */}
      {visible.length === 0 ? (
        <div style={{
          padding: 40, background: CF.surface, border: `1px solid ${CF.line}`,
          borderRadius: CF.radius.lg, fontFamily: CF.body, color: CF.ink3,
          fontSize: 13.5, textAlign: 'center',
        }}>
          No markets in this category right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {visible.map((m) => <WatchCard key={m.id} m={m} />)}
        </div>
      )}
    </section>
  )
}

function labelFor(id: Tab): string {
  return TABS.find((t) => t.id === id)?.label ?? id
}

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
