'use client'

// FADE OR FOLLOW — the core mechanic.
//
// The forecasters disagree, and each stakes real, chain-capped USDC by how sure
// it is. That disagreement IS the pot: the YES-voters' stakes vs the NO-voters'.
// You FOLLOW the lead forecaster (bet its side) or FADE it (bet the opposite),
// and the winning side splits the pot, pro-rata. Your bet is placed via the
// ERC-7715 capped mandate (the kit moment) — the chain won't let it overspend.

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { punditOf, handleOf } from '../lib/pundits'
import { AgentAvatar } from './AgentAvatar'
import type { PublishedCall } from '../lib/calls-data'
import { GrantCouncilMandate } from './GrantCouncilMandate'
import { CF, alpha } from '../lib/theme'

const STAKE_OPTIONS = [1, 2, 5] // USDC

function leadPundit(call: PublishedCall) {
  const onSide = call.votes.filter((v) => v.vote === call.side)
  const lead = (onSide.length ? onSide : call.votes)
    .slice()
    .sort((a, b) => b.confidence - a.confidence)[0]
  return lead ? punditOf(lead.role) : undefined
}

// The pot = the four forecasters' own stakes, sized by conviction. (The Skeptic
// cross-examines, it doesn't take a side, so it's excluded from the pool.)
function computePools(call: PublishedCall): { YES: number; NO: number } {
  const forecasters = call.votes.filter(
    (v) => v.role !== 'Skeptic' && (v.vote === 'YES' || v.vote === 'NO'),
  )
  const totalConf = forecasters.reduce((s, v) => s + v.confidence, 0) || 1
  const pot = call.bondUsdc || forecasters.length // total staked
  let YES = 0, NO = 0
  for (const v of forecasters) {
    const stake = pot * (v.confidence / totalConf)
    if (v.vote === 'YES') YES += stake
    else NO += stake
  }
  return { YES, NO }
}

export function FadeFollow({ call }: { call: PublishedCall }) {
  const { address } = useAccount()
  const [choice, setChoice] = useState<null | 'follow' | 'fade'>(null)
  const [amount, setAmount] = useState(2)

  const lead = leadPundit(call)
  const deskSide = call.side
  const fadeSide = deskSide === 'YES' ? 'NO' : 'YES'
  const betSide = choice === 'fade' ? fadeSide : deskSide
  const deskColor = deskSide === 'YES' ? CF.bull : CF.bear
  const fadeColor = fadeSide === 'YES' ? CF.bull : CF.bear
  const betColor = betSide === 'YES' ? CF.bull : CF.bear

  const pools = computePools(call)
  const total = pools.YES + pools.NO || 1

  // parimutuel: if betSide wins, your share of the whole pot, pro-rata to stake
  const sidePool = (betSide === 'YES' ? pools.YES : pools.NO)
  const payout = amount * (total + amount) / (sidePool + amount)
  const profit = payout - amount

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
        <AgentAvatar pundit={lead} size={44} radius={999} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink, lineHeight: 1.4 }}>
            <strong style={{ color: lead?.color ?? CF.ink, fontWeight: 700 }}>{lead?.handle ?? 'The desk'}</strong>
            {' '}leads the desk on{' '}
            <strong style={{ color: deskColor, fontWeight: 700 }}>{deskSide}</strong>.
          </div>
          <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 2 }}>
            {lead?.archetype ?? 'consensus call'} · staked, chain-capped, can’t bluff
          </div>
        </div>
      </div>

      {/* the pot — the forecasters' own disagreement */}
      <PoolBar pools={pools} />

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
        <div className="cf-rise" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink }}>
              You’re <strong style={{ color: betColor, fontWeight: 700 }}>
                {choice === 'fade' ? `fading ${lead?.handle ?? 'the desk'}` : `following ${lead?.handle ?? 'the desk'}`}
              </strong>{' '}— betting <strong style={{ color: betColor }}>{betSide}</strong>.
            </div>
            <button onClick={() => setChoice(null)} className="mono" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: CF.ink3, textDecoration: 'underline',
            }}>← change</button>
          </div>

          {/* stake size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 11, color: CF.ink3, letterSpacing: 0.5 }}>STAKE</span>
            {STAKE_OPTIONS.map((a) => (
              <button key={a} onClick={() => setAmount(a)} className="mono" style={{
                padding: '6px 12px', borderRadius: CF.radius.md, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: amount === a ? CF.ink : CF.surface,
                color: amount === a ? CF.bg : CF.ink2,
                border: `1px solid ${amount === a ? CF.ink : CF.line}`,
              }}>${a}</button>
            ))}
          </div>

          {/* payout preview */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 14px', marginBottom: 14, flexWrap: 'wrap',
            background: alpha(betColor, 8), border: `1px solid ${alpha(betColor, 25)}`, borderRadius: CF.radius.md,
          }}>
            <span style={{ fontFamily: CF.body, fontSize: 13, color: CF.ink2 }}>
              If <strong style={{ color: betColor }}>{betSide}</strong> wins, your ${amount.toFixed(0)} returns
            </span>
            <span className="mono tnum" style={{ fontSize: 18, fontWeight: 700, color: betColor }}>
              ${payout.toFixed(2)}
              <span style={{ fontSize: 12, color: profit >= 0 ? CF.positive : CF.bear, marginLeft: 6 }}>
                {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
              </span>
            </span>
          </div>

          {/* the on-chain bet = the capped ERC-7715 mandate, reframed. On grant,
              record the backed call so it shows up in The Vault. */}
          <GrantCouncilMandate
            onDone={() => {
              if (!address) return
              fetch('/api/bets', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user: address, callId: call.id, marketId: call.marketId, marketTitle: call.marketTitle,
                  agentHandle: handleOf(lead.role), choice: choice ?? 'follow', side: betSide, amountUsdc: amount,
                }),
              }).catch(() => {})
            }}
            context={{
              kicker: null,
              title: `Place your ${betSide} bet`,
              cta: `Bet ${betSide} · up to $5`,
              blurb: (
                <>Authorize up to <strong style={{ color: CF.ink, fontWeight: 600 }}>$5</strong> in MetaMask to place this bet.
                It’s a capped, expiring permission (ERC-7715) — the chain won’t let your bet exceed the limit, and you can
                revoke anytime. Try to bet past the cap and the transaction reverts on-chain.</>
              ),
            }} />
        </div>
      )}
    </div>
  )
}

function PoolBar({ pools }: { pools: { YES: number; NO: number } }) {
  const total = pools.YES + pools.NO || 1
  const yesPct = Math.round((pools.YES / total) * 100)
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: CF.mono, fontSize: 10.5, marginBottom: 5,
      }}>
        <span style={{ color: CF.bull, fontWeight: 600 }}>YES pool · {pools.YES.toFixed(2)}</span>
        <span style={{ color: CF.ink4 }}>the pot · {total.toFixed(2)} USDC</span>
        <span style={{ color: CF.bear, fontWeight: 600 }}>{pools.NO.toFixed(2)} · NO pool</span>
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: CF.surface2 }}>
        <div style={{ width: `${yesPct}%`, background: CF.bull, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
        <div style={{ width: `${100 - yesPct}%`, background: CF.bear, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
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
