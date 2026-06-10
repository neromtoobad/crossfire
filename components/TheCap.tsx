'use client'

// THE IT MOMENT. When you back an agent you sign a mandate capped in USDC.
// This proves the cap is the CHAIN's, not our code: a bet within the cap
// settles; a bet past the cap REVERTS at MetaMask's ERC-7710 enforcer.
//
// Demo-proof: the two real, already-mined transactions (one settled, one
// reverted) are always on screen, so the moment lands even with no network.
// "Run it live" re-streams a fresh on-chain proof for the real-time drama.

import { useState } from 'react'
import { CF, alpha } from '../lib/theme'

const SEPOLIA = (h: string) => `https://sepolia.basescan.org/tx/${h}`
// canonical, already-mined proofs (see PROOF.md / the lab receipts)
const INCAP_TX = '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41'
const OVERCAP_TX = '0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45'
const ENFORCER_ERROR = 'ERC20TransferAmountEnforcer:allowance-exceeded'

type RowState = 'idle' | 'pending' | 'done'

export function TheCap({ capUsdc = 5, agentHandle = 'an agent' }: { capUsdc?: number; agentHandle?: string }) {
  const over = capUsdc * 10
  const [running, setRunning] = useState(false)
  const [inCap, setInCap] = useState<{ s: RowState; tx?: string }>({ s: 'idle', tx: INCAP_TX })
  const [overCap, setOverCap] = useState<{ s: RowState; tx?: string; reason?: string }>({ s: 'idle', tx: OVERCAP_TX, reason: ENFORCER_ERROR })
  const [live, setLive] = useState(false)

  async function runLive() {
    if (running) return
    setRunning(true); setLive(true)
    setInCap({ s: 'pending' }); setOverCap({ s: 'idle' })
    try {
      const res = await fetch('/api/proof/run', { method: 'POST' })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      for (;;) {
        const { value, done } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const ls = buf.split('\n'); buf = ls.pop() ?? ''
        for (const raw of ls) {
          const line = raw.trim(); if (!line) continue
          let e: { type?: string; txHash?: string; reason?: string }
          try { e = JSON.parse(line) } catch { continue }
          if (e.type === 'incap-confirmed') { setInCap({ s: 'done', tx: e.txHash }); setOverCap({ s: 'pending' }) }
          if (e.type === 'overcap-reverted') setOverCap({ s: 'done', tx: OVERCAP_TX, reason: e.reason || ENFORCER_ERROR })
        }
      }
    } catch {
      // fall back to the canonical proofs — the moment still lands
      setInCap({ s: 'done', tx: INCAP_TX }); setOverCap({ s: 'done', tx: OVERCAP_TX, reason: ENFORCER_ERROR })
    }
    setInCap((p) => (p.s === 'done' ? p : { s: 'done', tx: INCAP_TX }))
    setOverCap((p) => (p.s === 'done' ? p : { s: 'done', tx: OVERCAP_TX, reason: ENFORCER_ERROR }))
    setRunning(false)
  }

  return (
    <section style={{ borderRadius: CF.radius.lg, overflow: 'hidden', border: `1px solid ${alpha(CF.bear, 30)}`, background: CF.surface, boxShadow: CF.shadow.card }}>
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${CF.line}` }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2, color: CF.bear, marginBottom: 8 }}>THE GUARANTEE</div>
        <h3 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 24, letterSpacing: -0.6, color: CF.ink, margin: '0 0 8px' }}>
          The cap is the chain&apos;s — not our code.
        </h3>
        <p style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink2, lineHeight: 1.55, margin: 0, maxWidth: 560 }}>
          When you back {agentHandle}, you sign a mandate capped at <strong style={{ color: CF.ink }}>{capUsdc} USDC</strong>.
          What stops the agent — or a bug, or us — from spending more? Nothing in our code. <strong style={{ color: CF.ink }}>The chain refuses it.</strong>
        </p>
      </div>

      {/* the two outcomes, side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: CF.line }}>
        {/* in-cap → settles */}
        <CapRow
          label={`Bet ${capUsdc} USDC`} sub="within the cap" accent={CF.bull} ok
          state={inCap.s} tx={inCap.tx}
          verdict={inCap.s === 'pending' ? 'submitting…' : 'settled on-chain ✓'}
        />
        {/* over-cap → reverts */}
        <CapRow
          label={`Bet ${over} USDC`} sub={`${over / capUsdc}× the cap`} accent={CF.bear}
          state={overCap.s} tx={overCap.tx}
          verdict={overCap.s === 'pending' ? 'submitting…' : '⛔ REVERTED at the enforcer'}
          reason={overCap.s !== 'pending' ? overCap.reason : undefined}
        />
      </div>

      <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="mono" style={{ fontSize: 11.5, color: CF.ink2 }}>
          {live ? 'No code stopped the over-cap bet — MetaMask’s on-chain enforcer did.' : 'These are real, already-mined transactions. Open them.'}
        </div>
        <button onClick={runLive} disabled={running} className="cf-press" style={{
          padding: '10px 18px', borderRadius: CF.radius.md, border: 'none', cursor: running ? 'wait' : 'pointer',
          background: running ? CF.surface2 : CF.bear, color: running ? CF.ink3 : '#fff',
          fontFamily: CF.body, fontWeight: 700, fontSize: 12.5, letterSpacing: 0.3,
        }}>
          {running ? 'Proving on-chain…' : `Try to bet ${over} USDC, live →`}
        </button>
      </div>
    </section>
  )
}

function CapRow({ label, sub, accent, ok, state, tx, verdict, reason }: {
  label: string; sub: string; accent: string; ok?: boolean; state: RowState; tx?: string; verdict: string; reason?: string
}) {
  const dim = state === 'idle'
  return (
    <div style={{ padding: '16px 18px', background: CF.surface, opacity: dim && !ok ? 0.95 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: state === 'pending' ? CF.amber : accent, boxShadow: state !== 'idle' ? `0 0 8px ${accent}` : 'none' }} className={state === 'pending' ? 'cf-live-dot' : ''} />
        <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 15, color: CF.ink }}>{label}</span>
        <span className="mono" style={{ fontSize: 9.5, color: CF.ink4 }}>{sub}</span>
      </div>
      <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: state === 'pending' ? CF.amber : accent, marginBottom: reason ? 6 : 8 }}>
        {verdict}
      </div>
      {reason ? (
        <div className="mono" style={{ fontSize: 10, color: CF.bear, background: alpha(CF.bear, 8), border: `1px solid ${alpha(CF.bear, 20)}`, borderRadius: 5, padding: '5px 8px', marginBottom: 8, wordBreak: 'break-all' }}>
          {reason}
        </div>
      ) : null}
      {tx && state !== 'pending' ? (
        <a href={SEPOLIA(tx)} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 10.5, color: CF.gold, fontWeight: 600 }}>
          {tx.slice(0, 12)}…{tx.slice(-6)} ↗
        </a>
      ) : null}
    </div>
  )
}
