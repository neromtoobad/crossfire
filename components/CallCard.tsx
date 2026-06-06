// CallCard — single published-call card for the public feed.
// Editorial-light treatment: serif headline, hairline borders, tabular figures,
// refined Bull/Bear semantic accents.

import Link from 'next/link'
import type { PublishedCall } from '../lib/calls-data'
import { relativeTime } from '../lib/calls-data'
import { CF } from '../lib/theme'

const AGENT_LETTER: Record<string, string> = {
  MacroScout: 'M',
  NewsHawk: 'N',
  CrowdPulse: 'C',
  BookWatcher: 'B',
  Skeptic: 'S',
}

export function CallCard({ call }: { call: PublishedCall }) {
  const isYes = call.side === 'YES'
  const sideColor = isYes ? CF.bull : CF.bear
  const sideTint = isYes ? CF.bullTint : CF.bearTint
  const sideInk = isYes ? CF.bullInk : CF.bearInk
  const selectedPct = Math.round(call.selectedSideProb * 100)
  const edgePts = Math.round(call.edge * 100)

  const nonSkeptic = call.votes.filter((v) => v.role !== 'Skeptic')
  const skepticOk = call.skepticVerdict === 'APPROVED'
  const agreed = nonSkeptic.filter((v) => v.vote === call.side).length
  const total = nonSkeptic.length

  return (
    <Link
      href={`/calls/${call.id}`}
      style={{
        display: 'block',
        background: CF.surface,
        border: `1px solid ${CF.line}`,
        borderRadius: CF.radius.lg,
        boxShadow: CF.shadow.card,
        padding: '22px 22px 18px',
        color: CF.ink,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
      }}
    >
      {/* ── eyebrow ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14,
      }}>
        <div className="mono" style={{
          fontSize: 10.5, letterSpacing: 1.6, color: CF.ink3,
        }}>
          {call.publishedBy.toUpperCase()} · {relativeTime(call.publishedAt).toUpperCase()}
        </div>
        <span style={{
          padding: '3px 9px', borderRadius: CF.radius.sm,
          background: sideTint, color: sideInk,
          fontFamily: CF.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: 1,
        }}>
          BUY {call.side}
        </span>
      </div>

      {/* ── headline ── */}
      <div style={{
        fontFamily: CF.display, fontSize: 20, fontWeight: 500,
        lineHeight: 1.22, letterSpacing: -0.4, color: CF.ink,
        marginBottom: 18,
        fontVariationSettings: '"opsz" 60',
      }}>
        {call.marketTitle}
      </div>

      {/* ── numbers row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
        padding: '14px 0', borderTop: `1px solid ${CF.line}`,
        borderBottom: `1px solid ${CF.line}`,
        marginBottom: 14,
      }}>
        <div>
          <div className="mono" style={{
            fontSize: 9.5, letterSpacing: 1.4, color: CF.ink4, marginBottom: 4,
          }}>
            P({call.side})
          </div>
          <div className="mono tnum" style={{
            fontSize: 26, fontWeight: 600, color: sideColor,
            letterSpacing: -0.5, lineHeight: 1,
          }}>
            {selectedPct}<span style={{ fontSize: 14, color: CF.ink3, fontWeight: 400 }}>%</span>
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${CF.line}`, paddingLeft: 14 }}>
          <div className="mono" style={{
            fontSize: 9.5, letterSpacing: 1.4, color: CF.ink4, marginBottom: 4,
          }}>
            EDGE
          </div>
          <div className="mono tnum" style={{
            fontSize: 22, fontWeight: 600, color: edgePts > 0 ? sideColor : CF.ink3,
            letterSpacing: -0.3, lineHeight: 1,
          }}>
            {edgePts > 0 ? '+' : ''}{edgePts}<span style={{ fontSize: 13, color: CF.ink3, fontWeight: 400 }}>pts</span>
          </div>
        </div>
      </div>

      {/* ── council pills ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 14,
      }}>
        {call.votes.map((v) => {
          const isAgree = v.vote === call.side
          const isAbstain = v.vote === 'ABSTAIN' || v.vote === 'NEUTRAL'
          const vColor = isAgree ? sideColor : isAbstain ? CF.amber : CF.ink3
          const vTint = isAgree ? sideTint : isAbstain ? CF.amberTint : CF.surface2
          return (
            <span
              key={v.role}
              title={`${v.role}: ${v.vote} (${(v.confidence * 100).toFixed(0)}%)`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: CF.radius.sm,
                background: vTint, color: vColor,
                border: `1px solid ${vColor}33`,
                fontFamily: CF.mono, fontSize: 11, fontWeight: 700,
              }}
            >
              {AGENT_LETTER[v.role] ?? '?'}
            </span>
          )
        })}
        <span className="mono" style={{
          fontSize: 11, color: CF.ink3, marginLeft: 8,
        }}>
          {agreed}/{total} agreed · Skeptic{' '}
          <span style={{ color: skepticOk ? CF.bull : CF.bear, fontWeight: 700 }}>
            {skepticOk ? '✓' : '✗'}
          </span>
        </span>
      </div>

      {/* ── footer ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 12, borderTop: `1px dashed ${CF.line2}`,
      }}>
        <div className="mono" style={{ fontSize: 11.5, color: CF.ink3 }}>
          bond <span className="tnum" style={{ color: CF.ink, fontWeight: 600 }}>{call.bondUsdc.toFixed(2)} USDC</span>
          {call.bondTxHash ? (
            <span style={{ color: CF.gold, marginLeft: 6, fontWeight: 600 }} title={`on-chain bond ${call.bondTxHash}`}>· on-chain ✓</span>
          ) : null}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: CF.body, fontWeight: 600, fontSize: 13,
          color: CF.ink,
        }}>
          Unlock thesis
          <span className="mono tnum" style={{ color: CF.ink3, fontSize: 11.5, fontWeight: 500 }}>
            ${call.unlockUsdc.toFixed(2)}
          </span>
          <span style={{ color: sideColor }}>→</span>
        </div>
      </div>
    </Link>
  )
}
