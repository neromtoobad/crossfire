'use client'

// CallCard, a matchup card for the feed. Leads with the forecaster who made
// the call (the character), shows the pot (the forecasters' own disagreement),
// the desk lineup, and a Fade-or-Follow CTA. The personality is the hook; the
// staked pot is the tension.

import Link from 'next/link'
import type { PublishedCall } from '../lib/calls-data'
import { relativeTime } from '../lib/time'
import { PUNDITS, punditOf } from '../lib/pundits'
import { getResolution } from '../lib/resolutions'
import { CF, alpha } from '../lib/theme'

function leadPundit(call: PublishedCall) {
  const onSide = call.votes.filter((v) => v.role !== 'Skeptic' && v.vote === call.side)
  const lead = (onSide.length ? onSide : call.votes.filter((v) => v.role !== 'Skeptic'))
    .slice().sort((a, b) => b.confidence - a.confidence)[0]
  return lead ? { p: punditOf(lead.role), conf: lead.confidence } : undefined
}

function pools(call: PublishedCall): { YES: number; NO: number } {
  const f = call.votes.filter((v) => v.role !== 'Skeptic' && (v.vote === 'YES' || v.vote === 'NO'))
  const totalConf = f.reduce((s, v) => s + v.confidence, 0) || 1
  const pot = call.bondUsdc || f.length
  let YES = 0, NO = 0
  for (const v of f) {
    const stake = pot * (v.confidence / totalConf)
    if (v.vote === 'YES') YES += stake; else NO += stake
  }
  return { YES, NO }
}

export function CallCard({ call }: { call: PublishedCall }) {
  const isYes = call.side === 'YES'
  const sideColor = isYes ? CF.bull : CF.bear

  const lead = leadPundit(call)
  const leadColor = lead?.p?.color ?? sideColor
  const pot = pools(call)
  const total = pot.YES + pot.NO || 1
  const yesPct = Math.round((pot.YES / total) * 100)

  const nonSkeptic = call.votes.filter((v) => v.role !== 'Skeptic')
  const skepticOk = call.skepticVerdict === 'APPROVED'
  const agreed = nonSkeptic.filter((v) => v.vote === call.side).length

  // resolved matches: did the panel's call (side) hit?
  const resolution = getResolution(call.marketId)
  const resolved = resolution !== 'PENDING'
  const hit = resolution === call.side

  return (
    <Link
      href={`/calls/${call.id}`}
      className="cf-card"
      style={{
        display: 'block', background: CF.surface,
        border: `1px solid ${CF.line}`, borderTop: `3px solid ${leadColor}`,
        borderRadius: CF.radius.lg, boxShadow: CF.shadow.card,
        padding: '16px 20px 16px', color: CF.ink, position: 'relative', overflow: 'hidden',
        transition: 'box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
      }}
    >
      {/* ── lead forecaster + time ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: lead?.p?.tint ?? CF.surface2, border: `1px solid ${alpha(leadColor, 25)}`,
            fontSize: 17, lineHeight: 1,
          }}>{lead?.p?.avatar ?? '🎙'}</span>
          <span style={{ fontFamily: CF.body, fontSize: 13.5, color: CF.ink, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <span style={{ color: leadColor, fontWeight: 700 }}>{lead?.p?.handle ?? 'The desk'}</span>
            {' '}calls{' '}
            <span style={{ color: sideColor, fontWeight: 700 }}>{call.side}</span>
          </span>
          {lead ? (
            <span className="mono tnum" style={{ fontSize: 11, color: CF.ink3 }}>
              {(lead.conf * 100).toFixed(0)}%
            </span>
          ) : null}
        </div>
        {resolved ? (
          <span className="mono" style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4, whiteSpace: 'nowrap',
            padding: '3px 8px', borderRadius: 999,
            background: hit ? CF.positiveTint : CF.bearTint,
            color: hit ? CF.positive : CF.bear,
          }}>
            {hit ? '✓ HIT' : '✗ MISS'}
          </span>
        ) : (
          <span className="mono" style={{ fontSize: 10, color: CF.ink4, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
            {relativeTime(call.publishedAt).toUpperCase()}
          </span>
        )}
      </div>

      {/* ── headline ── */}
      <div style={{
        fontFamily: CF.display, fontSize: 19, fontWeight: 500,
        lineHeight: 1.22, letterSpacing: -0.4, color: CF.ink, marginBottom: 16,
        fontVariationSettings: '"opsz" 60',
      }}>
        {call.marketTitle}
      </div>

      {/* ── the pot (matchup bar) ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: CF.mono, fontSize: 10, marginBottom: 5 }}>
          <span style={{ color: CF.bull, fontWeight: 700 }}>YES {pot.YES.toFixed(1)}</span>
          <span style={{ color: CF.ink4 }}>POT {total.toFixed(1)} USDC</span>
          <span style={{ color: CF.bear, fontWeight: 700 }}>{pot.NO.toFixed(1)} NO</span>
        </div>
        <div style={{ display: 'flex', height: 7, borderRadius: 999, overflow: 'hidden', background: CF.surface2 }}>
          <div style={{ width: `${yesPct}%`, background: CF.bull }} />
          <div style={{ width: `${100 - yesPct}%`, background: CF.bear }} />
        </div>
      </div>

      {/* ── the desk lineup (avatars by vote) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {call.votes.map((v) => {
          const p = PUNDITS[v.role]
          const isAgree = v.vote === call.side
          const isSkeptic = v.role === 'Skeptic'
          const dim = !isAgree && !isSkeptic
          return (
            <span
              key={v.role}
              title={`${p?.handle ?? v.role}: ${v.vote} (${(v.confidence * 100).toFixed(0)}%)`}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 999, fontSize: 13, lineHeight: 1,
                background: p?.tint ?? CF.surface2,
                border: `1.5px solid ${isSkeptic ? alpha(skepticOk ? CF.bull : CF.bear, 40) : alpha(p?.color ?? CF.ink3, isAgree ? 45 : 12)}`,
                opacity: dim ? 0.45 : 1,
              }}
            >{p?.avatar ?? '·'}</span>
          )
        })}
        <span className="mono" style={{ fontSize: 10.5, color: CF.ink3, marginLeft: 4 }}>
          {agreed} back {call.side} · Skeptic{' '}
          <span style={{ color: skepticOk ? CF.bull : CF.bear, fontWeight: 700 }}>{skepticOk ? '✓' : '✗'}</span>
        </span>
      </div>

      {/* ── footer: pot + Fade or Follow CTA ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 12, borderTop: `1px dashed ${CF.line2}`,
      }}>
        <div className="mono" style={{ fontSize: 11, color: CF.ink3 }}>
          {call.bondTxHash
            ? <span style={{ color: CF.gold, fontWeight: 600 }} title={`on-chain ${call.bondTxHash}`}>staked on-chain ✓</span>
            : <>staked <span className="tnum" style={{ color: CF.ink2, fontWeight: 600 }}>{call.bondUsdc.toFixed(2)}</span></>}
        </div>
        {resolved ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999,
            background: hit ? CF.positiveTint : CF.bearTint,
            border: `1px solid ${alpha(hit ? CF.positive : CF.bear, 30)}`,
            fontFamily: CF.body, fontWeight: 700, fontSize: 12, color: hit ? CF.positive : CF.bear,
          }}>
            {resolution} · {hit ? 'followers paid' : 'faders paid'}
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999,
            background: alpha(leadColor, 10), border: `1px solid ${alpha(leadColor, 30)}`,
            fontFamily: CF.body, fontWeight: 700, fontSize: 12.5, color: leadColor,
          }}>
            Fade or Follow
            <span style={{ fontSize: 13 }}>→</span>
          </span>
        )}
      </div>
    </Link>
  )
}
