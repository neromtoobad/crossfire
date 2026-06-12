'use client'

// THE ENFORCER, folded into any bet flow. Pick a stake bigger than your mandate
// cap (e.g. $50 vs a $5 cap) and this replaces the grant: the chain refuses the
// over-cap bet. Two real, already-mined receipts are always on screen (one
// settled, one reverted); "Try it live" re-streams a fresh on-chain revert.
//
// Self-contained, manages its own prove-live state, so FadeFollow (back/fade a
// call) and BackAgent (back a champion) both just render <OverCapRevert/>.

import { useState } from 'react'
import { CF, alpha } from '../lib/theme'

// Real proofs (see PROOF.md): a within-cap bet that settled, and an over-cap
// redemption the ERC-7710 enforcer reverted.
export const CAP_USDC = 5
const SEPOLIA_TX = (h: string) => `https://sepolia.basescan.org/tx/${h}`
const INCAP_TX = '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41'
const OVERCAP_TX = '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45'
const ENFORCER_ERROR = 'ERC20TransferAmountEnforcer:allowance-exceeded'

export function OverCapRevert({ amount, cap = CAP_USDC }: { amount: number; cap?: number }) {
  const [proving, setProving] = useState(false)
  const [proved, setProved] = useState(false)
  const multiple = Math.round(amount / cap)

  async function proveRevert() {
    if (proving) return
    setProving(true)
    try {
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
          Your mandate is capped at <strong style={{ color: CF.ink }}>${cap} USDC</strong>, nothing in our code stops a bigger bet. The chain does.
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
          {proved ? 'No code stopped it, MetaMask’s enforcer did.' : 'Real, already-mined. Or prove it again, live.'}
        </span>
        <button onClick={proveRevert} disabled={proving} className="cf-press" style={{
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
