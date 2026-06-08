'use client'

// FADE OR FOLLOW — the core mechanic.
//
// A forecaster (the lead pundit on this call) has staked real, chain-capped
// USDC on a side. You FOLLOW (bet the same side) or FADE (bet the opposite).
// When the market resolves, the winning side splits the pot. The on-chain bet
// is placed via the ERC-7715 capped mandate (the kit moment) — reused as-is.

import { useState } from 'react'
import { PUNDITS, punditOf } from '../lib/pundits'
import type { PublishedCall } from '../lib/calls-data'
import { GrantCouncilMandate } from './GrantCouncilMandate'
import { CF, alpha } from '../lib/theme'

function leadPundit(call: PublishedCall) {
  // the highest-conviction forecaster who's ON the call's side
  const onSide = call.votes.filter((v) => v.vote === call.side)
  const lead = (onSide.length ? onSide : call.votes)
    .slice()
    .sort((a, b) => b.confidence - a.confidence)[0]
  return lead ? punditOf(lead.role) : undefined
}

export function FadeFollow({ call }: { call: PublishedCall }) {
  const [choice, setChoice] = useState<null | 'follow' | 'fade'>(null)

  const lead = leadPundit(call)
  const deskSide = call.side                       // the side the desk staked
  const fadeSide = deskSide === 'YES' ? 'NO' : 'YES'
  const betSide = choice === 'fade' ? fadeSide : deskSide
  const deskColor = deskSide === 'YES' ? CF.bull : CF.bear
  const fadeColor = fadeSide === 'YES' ? CF.bull : CF.bear
  const stake = call.bondUsdc

  return (
    <div style={{
      background: CF.surface, border: `1px solid ${CF.line}`,
      borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, padding: '20px 22px',
    }}>
      <div className="mono" style={{ fontSize: 10.5, color: CF.gold, letterSpacing: 1.8, marginBottom: 12 }}>
        ▸ FADE OR FOLLOW · METAMASK SMART ACCOUNTS KIT
      </div>

      {/* the staked call */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: 999, flexShrink: 0,
          background: lead?.tint ?? CF.surface2, border: `1px solid ${alpha(lead?.color ?? CF.ink3, 25)}`,
          fontSize: 22, lineHeight: 1,
        }}>{lead?.avatar ?? '🎙'}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink, lineHeight: 1.4 }}>
            <strong style={{ color: lead?.color ?? CF.ink, fontWeight: 700 }}>{lead?.handle ?? 'The desk'}</strong>
            {' '}and the desk staked{' '}
            <strong style={{ color: deskColor, fontWeight: 700 }}>{stake.toFixed(2)} USDC on {deskSide}</strong>.
          </div>
          <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 2 }}>
            {lead?.archetype ?? 'consensus call'} · chain-capped, can’t bluff
          </div>
        </div>
      </div>

      {/* the pot */}
      <PoolBar deskSide={deskSide} fadeSide={fadeSide} deskStake={stake} deskColor={deskColor} fadeColor={fadeColor} />

      {/* the choice */}
      {choice === null ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <button onClick={() => setChoice('follow')} style={btn(deskColor, true)}>
              ↑ Follow · bet {deskSide}
            </button>
            <button onClick={() => setChoice('fade')} style={btn(fadeColor, false)}>
              ↓ Fade · bet {fadeSide}
            </button>
          </div>
          <p style={{ fontFamily: CF.body, fontSize: 12.5, color: CF.ink3, lineHeight: 1.5, margin: '12px 0 0' }}>
            <strong style={{ color: CF.ink2 }}>Follow</strong> if you think {lead?.handle ?? 'the desk'} is right;{' '}
            <strong style={{ color: CF.ink2 }}>Fade</strong> if you think they’re wrong. When the market resolves,
            the winning side splits the whole pot, pro-rata to stake.
          </p>
        </>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            marginBottom: 12,
          }}>
            <div style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink }}>
              You’re <strong style={{ color: choice === 'fade' ? fadeColor : deskColor, fontWeight: 700 }}>
                {choice === 'fade' ? `fading ${lead?.handle ?? 'the desk'}` : `following ${lead?.handle ?? 'the desk'}`}
              </strong>{' '}— betting <strong style={{ color: betSide === 'YES' ? CF.bull : CF.bear }}>{betSide}</strong>.
            </div>
            <button onClick={() => setChoice(null)} className="mono" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: CF.ink3, textDecoration: 'underline',
            }}>← change</button>
          </div>

          {/* the on-chain bet = the capped ERC-7715 mandate */}
          <GrantCouncilMandate />

          <p style={{ fontFamily: CF.body, fontSize: 12, color: CF.ink3, lineHeight: 1.5, margin: '12px 0 0' }}>
            Your bet is capped by the mandate above — the chain won’t let it exceed your limit.
            If <strong style={{ color: betSide === 'YES' ? CF.bull : CF.bear }}>{betSide}</strong> wins,
            you split the pot with everyone else on the {betSide} side.
          </p>
        </div>
      )}
    </div>
  )
}

function PoolBar({
  deskSide, fadeSide, deskStake, deskColor, fadeColor,
}: {
  deskSide: string; fadeSide: string; deskStake: number; deskColor: string; fadeColor: string
}) {
  // The desk anchors its side; the fade side is open until faders join.
  const fadeStake = 0
  const total = deskStake + fadeStake || 1
  const followPct = Math.round((deskStake / total) * 100)
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: CF.mono, fontSize: 10.5, color: CF.ink3, marginBottom: 5,
      }}>
        <span style={{ color: deskColor, fontWeight: 600 }}>{deskSide} · {deskStake.toFixed(2)} staked</span>
        <span style={{ color: fadeColor, fontWeight: 600 }}>{fadeSide} · open</span>
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: CF.surface2 }}>
        <div style={{ width: `${followPct}%`, background: deskColor }} />
        <div style={{ width: `${100 - followPct}%`, background: alpha(fadeColor, 30) }} />
      </div>
    </div>
  )
}

function btn(color: string, filled: boolean): React.CSSProperties {
  return {
    padding: '12px 14px', borderRadius: CF.radius.md, cursor: 'pointer',
    fontFamily: CF.body, fontSize: 14, fontWeight: 700, letterSpacing: 0.2,
    background: filled ? color : 'transparent',
    color: filled ? '#fff' : color,
    border: `1.5px solid ${color}`,
    transition: 'all 0.15s ease',
  }
}
