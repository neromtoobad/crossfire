// A single published-call card for the public feed.
// Renders the headline (free), agent-vote pills (free), and an
// "Unlock thesis" CTA that links to /calls/[id] where the user
// pays a micropayment to read the full reasoning.

import Link from 'next/link'
import type { PublishedCall } from '../lib/calls-data'
import { relativeTime } from '../lib/calls-data'

const CF = {
  bg: '#060608',
  panel: '#0c0c11',
  panelHi: '#101017',
  edge: '#1b1b23',
  edgeHi: '#2a2a36',
  text: '#ededf2',
  dim: '#8a8a99',
  dimmer: '#5a5a68',
  bull: '#3bc4ff',
  bear: '#ff2a4d',
  amber: '#ffbd45',
  white: '#ffffff',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

const AGENT_LETTER: Record<string, string> = {
  MacroScout: 'M',
  NewsHawk: 'N',
  CrowdPulse: 'C',
  BookWatcher: 'B',
  Skeptic: 'S',
}

export function CallCard({ call }: { call: PublishedCall }) {
  const sideColor = call.side === 'YES' ? CF.bull : CF.bear
  const selectedPct = Math.round(call.selectedSideProb * 100)
  const edgePts = Math.round(call.edge * 100)

  const nonSkeptic = call.votes.filter((v) => v.role !== 'Skeptic')
  const skepticVote = call.votes.find((v) => v.role === 'Skeptic')
  const agreed = nonSkeptic.filter((v) => v.vote === call.side).length
  const total = nonSkeptic.length

  return (
    <Link
      href={`/calls/${call.id}`}
      style={{
        display: 'block',
        padding: '20px 22px',
        background: CF.panel,
        border: `1px solid ${CF.edge}`,
        borderRadius: 12,
        textDecoration: 'none',
        color: CF.text,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* accent stripe in the call's side color */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5,
        background: sideColor, boxShadow: `0 0 10px ${sideColor}`,
      }} />

      {/* row 1: title + selected-side % */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.dim, marginBottom: 5,
          }}>
            {call.publishedBy} · {relativeTime(call.publishedAt)}
          </div>
          <div style={{
            fontFamily: CF.display, fontSize: 16, fontWeight: 600,
            color: CF.text, lineHeight: 1.35,
          }}>
            {call.marketTitle}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{
            fontFamily: CF.mono, fontSize: 26, fontWeight: 600,
            color: sideColor, letterSpacing: -0.5, lineHeight: 1,
          }}>
            {selectedPct}<span style={{ fontSize: 14, color: CF.dim }}>%</span>
          </div>
          <div style={{
            fontFamily: CF.mono, fontSize: 10, color: CF.dim, letterSpacing: 1, marginTop: 4,
          }}>
            P({call.side})
          </div>
        </div>
      </div>

      {/* row 2: side badge + edge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: `color-mix(in oklab, ${sideColor} 16%, transparent)`,
          border: `1px solid color-mix(in oklab, ${sideColor} 50%, transparent)`,
          color: sideColor,
          fontFamily: CF.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1,
        }}>
          BUY {call.side}
        </span>
        <span style={{
          fontFamily: CF.mono, fontSize: 11.5, color: CF.dim,
        }}>
          edge <span style={{ color: edgePts > 0 ? sideColor : CF.dim }}>+{edgePts}pts</span>
          {' '}vs market {Math.round(call.marketImpliedYes * 100)}% YES
        </span>
      </div>

      {/* row 3: agent vote pills */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14,
      }}>
        {call.votes.map((v) => {
          const vColor =
            v.vote === call.side
              ? sideColor
              : v.vote === 'ABSTAIN' || v.vote === 'NEUTRAL'
                ? CF.amber
                : CF.dimmer
          return (
            <span
              key={v.role}
              title={`${v.role}: ${v.vote} (${(v.confidence * 100).toFixed(0)}%)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 20, height: 20, borderRadius: 4,
                background: `color-mix(in oklab, ${vColor} 16%, transparent)`,
                border: `1px solid color-mix(in oklab, ${vColor} 50%, transparent)`,
                color: vColor,
                fontFamily: CF.mono, fontSize: 10.5, fontWeight: 700,
                justifyContent: 'center',
              }}
            >
              {AGENT_LETTER[v.role] ?? '?'}
            </span>
          )
        })}
        <span style={{
          fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, marginLeft: 4,
        }}>
          {agreed}/{total} agreed · Skeptic{' '}
          <span style={{ color: call.skepticVerdict === 'APPROVED' ? CF.bull : CF.bear }}>
            {call.skepticVerdict === 'APPROVED' ? '✓' : '✗'}
          </span>
        </span>
      </div>

      {/* row 4: bond + unlock CTA */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 14, borderTop: `1px dashed ${CF.edge}`,
      }}>
        <div style={{ fontFamily: CF.mono, fontSize: 11.5, color: CF.dim }}>
          bond <span style={{ color: CF.text, fontWeight: 600 }}>{call.bondUsdc.toFixed(2)} USDC</span>
          {call.bondTxHash ? (
            <span style={{ color: CF.bull, marginLeft: 6 }} title={`on-chain bond ${call.bondTxHash}`}>·  on-chain ✓</span>
          ) : null}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: CF.display, fontWeight: 600, fontSize: 12.5,
          color: CF.text,
        }}>
          unlock thesis
          <span style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 11 }}>
            ${call.unlockUsdc.toFixed(2)}
          </span>
          <span style={{ color: sideColor }}>→</span>
        </div>
      </div>
    </Link>
  )
}
