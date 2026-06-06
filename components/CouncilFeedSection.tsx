'use client'

// Tabbed council feed — keeps the home page tight. Default "All" shows
// every bonded call by recency. Per-category tabs filter to one bucket.

import { useMemo, useState } from 'react'
import { CF } from '../lib/theme'
import { CallCard } from './CallCard'
import type { PublishedCall } from '../lib/calls-data'

type Tab = 'all' | 'sports' | 'politics' | 'crypto' | 'tech' | 'macro' | 'other'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all',      label: 'All' },
  { id: 'sports',   label: 'Sports' },
  { id: 'politics', label: 'Politics' },
  { id: 'crypto',   label: 'Crypto' },
  { id: 'tech',     label: 'Tech' },
  { id: 'macro',    label: 'Macro' },
  { id: 'other',    label: 'Other' },
]

function bucketFor(marketId: string): Tab {
  if (marketId.startsWith('wc-')) return 'sports'
  if (/btc|eth|sol|crypto/.test(marketId)) return 'crypto'
  if (/gpt|openai|apple|gpt6/.test(marketId)) return 'tech'
  if (/fed|10y|cpi|rate/.test(marketId)) return 'macro'
  if (/trump|election|pardon/.test(marketId)) return 'politics'
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

  const visible = useMemo(() => {
    if (tab === 'all') return calls
    return calls.filter((c) => bucketFor(c.marketId) === tab)
  }, [calls, tab])

  return (
    <section style={{ padding: '32px 0 8px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 16, flexWrap: 'wrap', gap: 10,
      }}>
        <h2 className="mono" style={{
          fontSize: 11, letterSpacing: 2.4, color: CF.ink, margin: 0, fontWeight: 600,
        }}>
          <span style={{ marginRight: 8, color: CF.bull }}>●</span>
          COUNCIL FEED · {calls.length} BONDED · {bondedOnchain} ON-CHAIN ✓
        </h2>
        <span className="mono" style={{ fontSize: 10.5, color: CF.ink3 }}>
          our agents' calls with thesis unlock
        </span>
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="council feed categories" style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18,
        paddingBottom: 14, borderBottom: `1px solid ${CF.line}`,
      }}>
        {TABS.map((t) => {
          const active = tab === t.id
          const count = t.id === 'all' ? calls.length : (bucketCounts.get(t.id) ?? 0)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {visible.map((c) => <CallCard key={c.id} call={c} />)}
        </div>
      )}
    </section>
  )
}
