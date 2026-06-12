'use client'

// BACK AN AGENT, the whole product in one bet. You don't bet on a match; you
// back one of the five minds to finish the World Cup as the sharpest forecaster.
// The bet is placed via the ERC-7715 capped mandate (the kit moment): the chain
// caps it at $5, and a $50 stake (10× the cap) reverts at the enforcer.

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AgentAvatar } from './AgentAvatar'
import { punditOf } from '../lib/pundits'
import { GrantCouncilMandate } from './GrantCouncilMandate'
import { OverCapRevert, CAP_USDC } from './OverCapRevert'
import { recordBetLocal } from '../lib/bets-client'
import { recordMandateLocal } from '../lib/mandate-client'
import { PUBLIC } from '../lib/public-config'
import type { ChampionStanding } from '../lib/champion'
import { CF, alpha } from '../lib/theme'

const STAKE_OPTIONS = [1, 2, 5, 50] // $50 = 10× cap → the enforcer revert

export function BackAgent({ standing, onClose }: { standing: ChampionStanding; onClose?: () => void }) {
  const { address } = useAccount()
  const [amount, setAmount] = useState(2)
  const pundit = punditOf(standing.role)
  const overCap = amount > CAP_USDC
  const payout = amount * standing.oddsX

  return (
    <div style={{
      background: CF.surface, border: `1px solid ${alpha(standing.color, 45)}`,
      borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div className="mono" style={{ fontSize: 10.5, color: CF.gold, letterSpacing: 1.6 }}>
          ▸ BACK FOR THE TITLE · METAMASK SMART ACCOUNTS KIT
        </div>
        {onClose ? (
          <button onClick={onClose} className="mono" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: CF.ink3, textDecoration: 'underline' }}>← back to board</button>
        ) : null}
      </div>

      {/* who you're backing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <AgentAvatar pundit={pundit} size={46} radius={10} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: CF.body, fontSize: 16, color: CF.ink, lineHeight: 1.3 }}>
            Back <strong style={{ color: standing.color, fontWeight: 800 }}>{standing.handle}</strong> to be crowned the sharpest oracle.
          </div>
          <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 3 }}>
            {standing.leading ? 'current leader' : `currently #${standing.rank}`} · {standing.resolved ? `${standing.won}/${standing.resolved} calls right` : 'no graded calls yet'} · odds <span style={{ color: CF.gold, fontWeight: 700 }}>{standing.oddsX.toFixed(1)}×</span>
          </div>
        </div>
      </div>

      {/* stake size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
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

      {overCap ? (
        <OverCapRevert amount={amount} cap={CAP_USDC} />
      ) : (
        <>
          {/* projected payout */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '12px 14px', marginBottom: 14,
            background: alpha(standing.color, 8), border: `1px solid ${alpha(standing.color, 25)}`, borderRadius: CF.radius.md,
          }}>
            <span style={{ fontFamily: CF.body, fontSize: 13, color: CF.ink2 }}>
              If <strong style={{ color: standing.color }}>{standing.handle}</strong> wins the title, your ${amount.toFixed(0)} returns
            </span>
            <span className="mono tnum" style={{ fontSize: 18, fontWeight: 700, color: CF.gold }}>
              ${payout.toFixed(2)}
              <span style={{ fontSize: 12, color: CF.positive, marginLeft: 6 }}>+{(payout - amount).toFixed(2)}</span>
            </span>
          </div>

          <GrantCouncilMandate
            onDone={(granted) => {
              if (!address) return
              const proof = granted ? {
                context: granted.context, delegationManager: granted.delegationManager,
                capUsdc: granted.capUsdc, expiry: granted.expiry, redeemer: granted.redeemer, chainId: PUBLIC.chainId,
              } : undefined
              const callId = `champion:${standing.role}`
              recordBetLocal({
                user: address, callId, marketId: 'champion', marketTitle: 'Champion Oracle, World Cup 2026',
                agentHandle: standing.handle, choice: 'follow', side: 'YES', amountUsdc: amount, ts: Date.now(),
                proof, kind: 'champion', agentRole: standing.role, oddsX: standing.oddsX,
              })
              recordMandateLocal({
                user: address, marketId: callId, marketTitle: `Back ${standing.handle} for the title`,
                capUsdc: granted?.capUsdc ?? 5,
                expiresAt: granted?.expiry ? granted.expiry * 1000 : Date.now() + 3600_000,
                context: granted?.context, redeemer: granted?.redeemer, ts: Date.now(),
              })
              fetch('/api/bets', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user: address, callId, marketId: 'champion', marketTitle: 'Champion Oracle, World Cup 2026',
                  agentHandle: standing.handle, choice: 'follow', side: 'YES', amountUsdc: amount, proof,
                  kind: 'champion', agentRole: standing.role, oddsX: standing.oddsX,
                }),
              }).catch(() => {})
            }}
            context={{
              kicker: null,
              title: `Back ${standing.handle} · $${amount}`,
              cta: `Back ${standing.handle} · up to $5`,
              blurb: (
                <>Authorize up to <strong style={{ color: CF.ink, fontWeight: 600 }}>$5</strong> in MetaMask to stake on {standing.handle}.
                It’s a capped, expiring permission (ERC-7715), the chain won’t let your stake exceed the limit, and you can
                revoke anytime. Try to back past the cap and the transaction reverts on-chain.</>
              ),
            }} />
        </>
      )}
    </div>
  )
}
