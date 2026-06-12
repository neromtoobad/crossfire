'use client'

// Tabbed council feed, keeps the home page tight. Default "All" shows
// every bonded call by recency. Per-category tabs filter to one bucket.

import { useMemo, useState } from 'react'
import { CF } from '../lib/theme'
import { CallCard } from './CallCard'
import { getResolution } from '../lib/resolutions'
import type { PublishedCall } from '../lib/calls-data'

type Tab = 'all' | 'live' | 'results' | 'outright' | 'knockouts' | 'goals' | 'group' | 'other'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all',       label: 'All' },
  { id: 'live',      label: 'Live' },
  { id: 'results',   label: 'Results' },
  { id: 'outright',  label: 'Outright' },
  { id: 'knockouts', label: 'Knockouts' },
  { id: 'goals',     label: 'Goals' },
  { id: 'group',     label: 'Group' },
]

function bucketFor(marketId: string): Tab {
  if (/golden|score|goals|btts|hattrick/.test(marketId)) return 'goals'
  if (/winner|outright|champion|quarters|argentina-2026/.test(marketId)) return 'outright'
  if (/group/.test(marketId)) return 'group'
  if (/wc-/.test(marketId)) return 'knockouts'
  return 'other'
}

export function CouncilFeedSection({
  calls,
  bondedOnchain,
}: {
  calls: PublishedCall[]
  bondedOnchain: number
}) {
  const [tab, setTab] = useState<Tab>('all')

  const bucketCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of calls) {
      const b = bucketFor(c.marketId)
      m.set(b, (m.get(b) ?? 0) + 1)
    }
    return m
  }, [calls])

  const liveCount = useMemo(() => calls.filter((c) => getResolution(c.marketId) === 'PENDING').length, [calls])
  const resolvedCount = calls.length - liveCount

  // "All" shows the marquee calls (calls are pre-sorted newest-first, so the
  // hand-authored picks lead); a specific tab shows that bucket in full.
  const ALL_CAP = 18
  const visible = useMemo(() => {
    if (tab === 'all') return calls.slice(0, ALL_CAP)
    if (tab === 'live') return calls.filter((c) => getResolution(c.marketId) === 'PENDING')
    if (tab === 'results') return calls.filter((c) => getResolution(c.marketId) !== 'PENDING')
    return calls.filter((c) => bucketFor(c.marketId) === tab)
  }, [calls, tab])
  const hiddenInAll = tab === 'all' ? Math.max(0, calls.length - ALL_CAP) : 0

  return (
    <section style={{ padding: '32px 0 8px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 16, flexWrap: 'wrap', gap: 10,
      }}>
        <h2 className="mono" style={{
          fontSize: 11, letterSpacing: 2.4, color: CF.ink, margin: 0, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="cf-live-dot" aria-hidden />
          MATCHDAY · {calls.length} CALLS · {bondedOnchain} ON-CHAIN ✓
        </h2>
        <span className="mono" style={{ fontSize: 10.5, color: CF.ink3 }}>
          fade or follow the pundits
        </span>
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="council feed categories" style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18,
        paddingBottom: 14, borderBottom: `1px solid ${CF.line}`,
      }}>
        {TABS.map((t) => {
          const active = tab === t.id
          const count = t.id === 'all' ? calls.length
            : t.id === 'live' ? liveCount
            : t.id === 'results' ? resolvedCount
            : (bucketCounts.get(t.id) ?? 0)
          if (t.id !== 'all' && count === 0) return null
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

      {visible.length === 0 ? (
        <div style={{
          padding: 40, background: CF.surface, border: `1px solid ${CF.line}`,
          borderRadius: CF.radius.lg, fontFamily: CF.body, color: CF.ink3,
          fontSize: 13.5, textAlign: 'center',
        }}>
          No calls in this category yet.
        </div>
      ) : (
        <div className="cf-g2 cf-stagger" style={{ gap: 14 }}>
          {visible.map((c) => <CallCard key={c.id} call={c} />)}
        </div>
      )}

      {hiddenInAll > 0 ? (
        <div style={{
          marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: CF.body, fontSize: 13, color: CF.ink3,
        }}>
          + {hiddenInAll} more fixtures -
          <button onClick={() => setTab('group')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: CF.body, fontSize: 13, fontWeight: 600, color: CF.ink, textDecoration: 'underline',
          }}>
            see all group fixtures →
          </button>
        </div>
      ) : null}
    </section>
  )
}
