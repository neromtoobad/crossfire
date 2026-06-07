'use client'

// Compact card for a Polymarket "watch list" market. Phase 9.2: the primary
// click now SENDS THE MARKET TO THE COUNCIL (live debate); a small secondary
// link opens it on Polymarket.

import { CF, alpha } from '../lib/theme'
import type { WatchMarket } from '../lib/polymarket-feed'

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

function shortQuestion(q: string): string {
  const cleaned = q.replace(/\s+/g, ' ').trim()
  return cleaned.length > 100 ? cleaned.slice(0, 98) + '…' : cleaned
}

function trendArrow(change?: number): { arrow: string; color: string } {
  if (change == null || !Number.isFinite(change)) return { arrow: '·', color: CF.ink3 }
  if (change > 0.005) return { arrow: '▲', color: CF.bull }
  if (change < -0.005) return { arrow: '▼', color: CF.bear }
  return { arrow: '·', color: CF.ink3 }
}

export function WatchCard({ m, onScout }: { m: WatchMarket; onScout?: (m: WatchMarket) => void }) {
  const pct = Math.round(m.yes * 100)
  const sideColor = pct >= 50 ? CF.bull : pct >= 20 ? CF.amber : CF.bear
  const sideTint  = pct >= 50 ? CF.bullTint : pct >= 20 ? CF.amberTint : CF.bearTint
  const dayTrend  = trendArrow(m.oneDayPriceChange)
  const weekTrend = trendArrow(m.oneWeekPriceChange)
  const daysToClose = m.endDate ? Math.max(0, Math.round((new Date(m.endDate).getTime() - Date.now()) / 86400000)) : null
  const pmUrl = `https://polymarket.com/event/${m.eventSlug}?market=${m.slug}`

  return (
    <div
      onClick={() => onScout?.(m)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onScout?.(m) }}
      style={{
        display: 'block',
        background: CF.surface,
        border: `1px solid ${CF.line}`,
        borderRadius: CF.radius.lg,
        padding: '14px 16px',
        color: CF.ink,
        boxShadow: CF.shadow.card,
        cursor: onScout ? 'pointer' : 'default',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 12, marginBottom: 10,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="mono" style={{
            fontSize: 9.5, letterSpacing: 1.4, color: CF.ink3, marginBottom: 4,
          }}>
            POLYMARKET · {m.eventTitle?.toUpperCase().slice(0, 40) || 'MARKET'}
          </div>
          <div style={{
            fontFamily: CF.body, fontSize: 13.5, fontWeight: 500,
            color: CF.ink, lineHeight: 1.4,
          }}>
            {shortQuestion(m.question)}
          </div>
        </div>
        <div style={{
          flexShrink: 0, textAlign: 'right',
          padding: '4px 10px', borderRadius: CF.radius.sm,
          background: sideTint, border: `1px solid ${alpha(sideColor, 20)}`,
        }}>
          <div className="mono tnum" style={{
            fontSize: 16, fontWeight: 600, color: sideColor, lineHeight: 1.1,
          }}>
            {pct}<span style={{ fontSize: 10, color: CF.ink3, fontWeight: 400 }}>%</span>
          </div>
          <div className="mono" style={{
            fontSize: 8.5, letterSpacing: 0.8, color: CF.ink3, marginTop: 1,
          }}>
            YES
          </div>
        </div>
      </div>
      <div className="mono" style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        fontSize: 10.5, color: CF.ink3,
        paddingTop: 8, borderTop: `1px dashed ${CF.line}`,
      }}>
        <span className="tnum" title="Cumulative volume">vol <span style={{ color: CF.ink }}>{fmtUsd(m.volumeUsd)}</span></span>
        {m.oneDayPriceChange != null ? (
          <span title="1-day price change" className="tnum">
            1d <span style={{ color: dayTrend.color }}>{dayTrend.arrow} {Math.abs((m.oneDayPriceChange) * 100).toFixed(1)}pts</span>
          </span>
        ) : null}
        {m.oneWeekPriceChange != null ? (
          <span title="1-week price change" className="tnum">
            7d <span style={{ color: weekTrend.color }}>{weekTrend.arrow} {Math.abs((m.oneWeekPriceChange) * 100).toFixed(1)}pts</span>
          </span>
        ) : null}
        {daysToClose != null ? (
          <span title="Days until market close">
            ends <span className="tnum" style={{ color: CF.ink2 }}>{daysToClose}d</span>
          </span>
        ) : null}

        {/* secondary: open on Polymarket without triggering the scout */}
        <span
          role="link"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(pmUrl, '_blank', 'noopener') }}
          style={{ marginLeft: 'auto', color: CF.ink4, cursor: 'pointer' }}
        >
          Polymarket ↗
        </span>
        {/* primary affordance */}
        <span style={{ color: CF.bull, fontWeight: 700, letterSpacing: 0.4 }}>
          ⚖ debate →
        </span>
      </div>
    </div>
  )
}
