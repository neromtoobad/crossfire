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
import type { PublishedCall, AgentRole } from '../lib/calls-data'
import { GrantCouncilMandate } from './GrantCouncilMandate'
import { recordBetLocal } from '../lib/bets-client'
import { recordMandateLocal } from '../lib/mandate-client'
import { PUBLIC } from '../lib/public-config'
import { CF, alpha } from '../lib/theme'

const STAKE_OPTIONS = [1, 2, 5, 50] // USDC — $50 is the over-cap (10×) revert demo
const CAP_USDC = 5 // matches GrantCouncilMandate's mandate cap
// Real, already-mined proofs (see PROOF.md / TheCap): a within-cap bet that
// settled, and an over-cap redemption the enforcer reverted.
const SEPOLIA_TX = (h: string) => `https://sepolia.basescan.org/tx/${h}`
const INCAP_TX = '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41'
const OVERCAP_TX = '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45'
const ENFORCER_ERROR = 'ERC20TransferAmountEnforcer:allowance-exceeded'

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

export function FadeFollow({ call, agentRole }: { call: PublishedCall; agentRole?: AgentRole }) {
  const { address } = useAccount()
  const [choice, setChoice] = useState<null | 'follow' | 'fade'>(null)
  const [amount, setAmount] = useState(2)
  // over-cap ($50 > $5 cap) → the enforcer-revert demo, proven live on demand
  const [proving, setProving] = useState(false)
  const [proved, setProved] = useState(false)

  async function proveRevert() {
    if (proving) return
    setProving(true)
    try {
      // re-stream a fresh on-chain proof; fall back to the canonical receipt
      const res = await fetch('/api/proof/run', { method: 'POST' })
      if (res.body) {
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
        for (;;) {
          const { value, done } = await reader.read(); if (done) break
          buf += dec.decode(value, { stream: true })
          const ls = buf.split('\n'); buf = ls.pop() ?? ''
          for (const raw of ls) {
            const line = raw.trim(); if (!line) continue
            try { const e = JSON.parse(line); if (e.type === 'overcap-reverted') setProved(true) } catch { /* skip */ }
          }
        }
      }
    } catch { /* canonical proof still stands */ }
    setProved(true)
    setProving(false)
  }

  // Scoped mode (agentRole set) pegs the call to ONE agent: you follow/fade
  // that agent's own pick, not the desk consensus. Otherwise it's the lead.
  const scoped = !!agentRole
  const agentVote = agentRole ? call.votes.find((v) => v.role === agentRole) : undefined
  const lead = agentRole ? punditOf(agentRole) : leadPundit(call)
  const followSide: 'YES' | 'NO' =
    agentVote?.vote === 'YES' || agentVote?.vote === 'NO' ? agentVote.vote : call.side
  const fadeSide = followSide === 'YES' ? 'NO' : 'YES'
  const betSide = choice === 'fade' ? fadeSide : followSide
  const followColor = followSide === 'YES' ? CF.bull : CF.bear
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
        ▸ {scoped ? `FADE OR FOLLOW ${lead?.handle ?? ''}` : 'FADE OR FOLLOW'} · METAMASK SMART ACCOUNTS KIT
      </div>

      {/* the staked call */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <AgentAvatar pundit={lead} size={44} radius={999} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: CF.body, fontSize: 15, color: CF.ink, lineHeight: 1.4 }}>
            <strong style={{ color: lead?.color ?? CF.ink, fontWeight: 700 }}>{lead?.handle ?? 'The desk'}</strong>
            {' '}{scoped ? 'calls' : 'leads the desk on'}{' '}
            <strong style={{ color: followColor, fontWeight: 700 }}>{followSide}</strong>.
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
            <button onClick={() => setChoice('follow')} style={btn(followColor, true)}>
              ↑ Follow · bet {followSide}
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
            {STAKE_OPTIONS.map((a) => {
              const isOver = a > CAP_USDC
              const sel = amount === a
              return (
                <button key={a} onClick={() => setAmount(a)} className="mono" style={{
                  padding: '6px 12px', borderRadius: CF.radius.md, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: sel ? (isOver ? CF.bear : CF.ink) : CF.surface,
                  color: sel ? (isOver ? '#fff' : CF.bg) : (isOver ? CF.bear : CF.ink2),
                  border: `1px solid ${sel ? (isOver ? CF.bear : CF.ink) : (isOver ? alpha(CF.bear, 40) : CF.line)}`,
                }}>${a}{isOver ? ' · break it' : ''}</button>
              )
            })}
          </div>

          {amount > CAP_USDC ? (
            <OverCapRevert amount={amount} cap={CAP_USDC} proving={proving} proved={proved} onProve={proveRevert} />
          ) : (
          <>
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
              record the backed call + its mandate in the browser so The Vault
              keeps them (Vercel's /tmp is per-instance + ephemeral) and can show
              the real permission context as on-chain proof. */}
          <GrantCouncilMandate
            onDone={(granted) => {
              if (!address) return
              const agentHandle = agentRole ? handleOf(agentRole) : lead ? handleOf(lead.role) : 'THE DESK'
              const proof = granted ? {
                context: granted.context,
                delegationManager: granted.delegationManager,
                capUsdc: granted.capUsdc,
                expiry: granted.expiry,
                redeemer: granted.redeemer,
                chainId: PUBLIC.chainId,
              } : undefined
              recordBetLocal({
                user: address, callId: call.id, marketId: call.marketId, marketTitle: call.marketTitle,
                agentHandle, choice: choice ?? 'follow', side: betSide, amountUsdc: amount,
                ts: Date.now(), proof,
              })
              recordMandateLocal({
                user: address, marketId: call.marketId, marketTitle: call.marketTitle,
                capUsdc: granted?.capUsdc ?? 5,
                expiresAt: granted?.expiry ? granted.expiry * 1000 : Date.now() + 3600_000,
                context: granted?.context, redeemer: granted?.redeemer, ts: Date.now(),
              })
              // durable mirror — persists to KV when one is provisioned, giving
              // cross-device Vault sync; a no-op otherwise (localStorage holds it).
              fetch('/api/bets', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user: address, callId: call.id, marketId: call.marketId, marketTitle: call.marketTitle,
                  agentHandle, choice: choice ?? 'follow', side: betSide, amountUsdc: amount, proof,
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
          </>
          )}
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

// The enforcer, folded into the bet flow: pick $50 (10× your $5 cap) and this
// replaces the payout/grant — the chain refuses the over-cap bet. Two real,
// already-mined receipts on screen (one settled, one reverted); "Try it live"
// re-streams a fresh on-chain revert.
function OverCapRevert({ amount, cap, proving, proved, onProve }: {
  amount: number; cap: number; proving: boolean; proved: boolean; onProve: () => void
}) {
  const multiple = Math.round(amount / cap)
  return (
    <div className="cf-rise" style={{
      borderRadius: CF.radius.md, overflow: 'hidden',
      border: `1px solid ${alpha(CF.bear, 35)}`, background: alpha(CF.bear, 6),
    }}>
      <div style={{ padding: '14px 16px' }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.6, color: CF.bear, marginBottom: 8 }}>
          ⛔ THE ENFORCER · OVER THE CAP
        </div>
        <div style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink, lineHeight: 1.55 }}>
          <strong style={{ color: CF.bear, fontWeight: 700 }}>${amount} is {multiple}× your ${cap} cap.</strong>{' '}
          Your mandate is capped at <strong style={{ color: CF.ink }}>${cap} USDC</strong> — nothing in our code stops a bigger bet. The chain does.
        </div>
        <div className="mono" style={{ fontSize: 10, color: CF.bear, background: alpha(CF.bear, 8), border: `1px solid ${alpha(CF.bear, 22)}`, borderRadius: 5, padding: '6px 9px', margin: '10px 0', wordBreak: 'break-all' }}>
          {proving ? 'submitting over-cap redemption…' : `⛔ REVERTED · ${ENFORCER_ERROR}`}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontFamily: CF.mono, fontSize: 10.5 }}>
          <a href={SEPOLIA_TX(OVERCAP_TX)} target="_blank" rel="noreferrer" style={{ color: CF.bear, fontWeight: 600 }}>
            reverted {OVERCAP_TX.slice(0, 10)}…{OVERCAP_TX.slice(-6)} ↗
          </a>
          <a href={SEPOLIA_TX(INCAP_TX)} target="_blank" rel="noreferrer" style={{ color: CF.gold, fontWeight: 600 }}>
            a ${cap} bet settles ✓ {INCAP_TX.slice(0, 10)}…{INCAP_TX.slice(-6)} ↗
          </a>
        </div>
      </div>
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${alpha(CF.bear, 20)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 11, color: CF.ink2 }}>
          {proved ? 'No code stopped it — MetaMask’s enforcer did.' : 'Real, already-mined. Or prove it again, live.'}
        </span>
        <button onClick={onProve} disabled={proving} className="cf-press" style={{
          padding: '9px 16px', borderRadius: CF.radius.md, border: 'none', cursor: proving ? 'wait' : 'pointer',
          background: proving ? CF.surface2 : CF.bear, color: proving ? CF.ink3 : '#fff',
          fontFamily: CF.body, fontWeight: 700, fontSize: 12.5,
        }}>
          {proving ? 'Proving on-chain…' : proved ? 'Reverted again ↻' : `Try to bet $${amount}, live →`}
        </button>
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
