'use client'

// RevertProof — Phase 8.12.
//
// One click runs the ERC-7710 revert proof live. The screen splits into two
// outcomes: IN-CAP success (1 USDC transfer) and OVER-CAP reverted (60 USDC
// attempt blocked at the enforcer). The over-cap card surfaces the actual
// revert reason returned by the DelegationManager / ERC20TransferAmountEnforcer.
//
// This is the hero moment for the x402 + ERC-7710 track: the chain — not the
// code — refuses the over-cap mandate, and the user sees it happen.

import { useRef, useState, useEffect } from 'react'
import { CF } from '../lib/theme'

const BASESCAN = (h: string) => `https://sepolia.basescan.org/tx/${h}`

type Phase =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'incap-ok'; txHash: string }
  | { kind: 'overcap-reverted'; reason: string; capUsdc: string }
  | { kind: 'error'; message: string }

type LogLine = { kind: 'info' | 'good' | 'bad'; text: string; tx?: string }

export function RevertProof({ onDone }: { onDone?: () => void } = {}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [lines, setLines] = useState<LogLine[]>([])
  const [inCapTx, setInCapTx] = useState<string | null>(null)
  const [overCapReason, setOverCapReason] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Spine hook: notify a parent once the over-cap attempt has reverted.
  useEffect(() => {
    if (phase.kind === 'overcap-reverted') onDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind])

  function push(line: LogLine) { setLines((cur) => [...cur, line]) }

  function eventToLine(e: any): LogLine | null {
    switch (e.type) {
      case 'started':
        return { kind: 'info', text: `▸ proof started · USER ${e.userEoa.slice(0,8)}… (SA ${e.userSa.slice(0,8)}…) · ORCH ${e.orchEoa.slice(0,8)}…` }
      case 'sa-deployed':
        return { kind: 'good', text: `✓ ${e.which} SA deployed` }
      case 'sa-funded':
        return { kind: 'good', text: `✓ ${e.which} SA funded (≥10 USDC)` }
      case 'mandate-signed':
        return { kind: 'good', text: `✓ root mandate signed · cap ${e.capUsdc} USDC · expires block ${e.expiresAtBlock}` }
      case 'incap-attempt':
        return { kind: 'info', text: `▸ [A] in-cap redeem · attempt ${e.amountUsdc} USDC transfer via ORCH delegation` }
      case 'incap-confirmed':
        return { kind: 'good', text: `✓ in-cap redeem confirmed — cap accepted ${e.amountUsdc} USDC`, tx: e.txHash }
      case 'overcap-attempt':
        return { kind: 'info', text: `▸ [B] OVER-CAP attempt · trying ${e.amountUsdc} USDC against ${e.capUsdc} USDC cap — should REVERT` }
      case 'overcap-reverted':
        return { kind: 'good', text: `✓ chain refused over-cap mandate — enforcer reverted` }
      case 'error':
        return { kind: 'bad', text: `× ${e.message}` }
      case 'heartbeat':
      case 'done':
        return null
      default:
        return { kind: 'info', text: `· ${e.type}` }
    }
  }

  async function start() {
    if (phase.kind === 'running') return
    setLines([]); setInCapTx(null); setOverCapReason(null)
    setPhase({ kind: 'running' })
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch('/api/proof/run', {
        method: 'POST', signal: ctrl.signal,
      })
      if (!res.ok || !res.body) {
        push({ kind: 'bad', text: `× HTTP ${res.status}` })
        setPhase({ kind: 'error', message: `HTTP ${res.status}` })
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const ls = buf.split('\n')
        buf = ls.pop() ?? ''
        for (const raw of ls) {
          const line = raw.trim()
          if (!line) continue
          let evt: any
          try { evt = JSON.parse(line) } catch { continue }
          if (evt.type === 'incap-confirmed') setInCapTx(evt.txHash)
          if (evt.type === 'overcap-reverted') setOverCapReason(evt.reason)
          if (evt.type === 'error') setPhase({ kind: 'error', message: evt.message })
          const ln = eventToLine(evt)
          if (ln) push(ln)
        }
      }
      // Final phase summary
      if (overCapReason || phase.kind !== 'error') {
        setPhase({ kind: 'overcap-reverted', reason: overCapReason ?? '', capUsdc: '50' })
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        push({ kind: 'bad', text: `× stream error: ${e?.message ?? e}` })
        setPhase({ kind: 'error', message: e?.message ?? String(e) })
      }
    }
  }
  function cancel() { abortRef.current?.abort(); setPhase({ kind: 'idle' }) }

  const running = phase.kind === 'running'
  const completed = !!inCapTx && !!overCapReason

  return (
    <div style={{
      background: CF.surface, border: `1px solid ${CF.line}`,
      borderRadius: CF.radius.lg, boxShadow: CF.shadow.card,
      padding: '24px 24px 22px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 18,
      }}>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <div className="mono" style={{
            fontSize: 10.5, color: CF.bear, letterSpacing: 2, marginBottom: 8,
          }}>
            ▸ THE REVERT · ERC-7710 ENFORCER
          </div>
          <div style={{
            fontFamily: CF.display, fontSize: 26, fontWeight: 500,
            letterSpacing: -0.6, color: CF.ink, lineHeight: 1.15,
            fontVariationSettings: '"opsz" 48',
          }}>
            Watch the blockchain block an overspend
          </div>
          <p style={{
            fontFamily: CF.body, fontSize: 14, color: CF.ink2,
            marginTop: 8, marginBottom: 0, maxWidth: 580, lineHeight: 1.55,
          }}>
            One click. First it spends $1 against a $50 limit — that goes through.
            Then it tries to spend $60 against that same limit, and the blockchain
            <em style={{ fontStyle: 'italic', color: CF.ink }}> rejects the transaction </em>
            on the spot. Our code never blocks it. The network does.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {running ? (
            <button onClick={cancel} style={btnSecondary}>Cancel</button>
          ) : (
            <button onClick={start} style={btnPrimary}>
              {completed ? 'Run again' : 'Run the proof'}
            </button>
          )}
        </div>
      </div>

      {/* split outcome strip */}
      {(running || inCapTx || overCapReason) ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12,
        }}>
          {/* IN-CAP success */}
          <div style={{
            padding: '14px 16px', borderRadius: CF.radius.md,
            background: inCapTx ? CF.bullTint : CF.surface2,
            border: `1px solid ${inCapTx ? CF.bull + '40' : CF.line}`,
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: CF.ink3, marginBottom: 6 }}>
              [A] IN-CAP — 1 USDC
            </div>
            <div style={{
              fontFamily: CF.body, fontSize: 14, fontWeight: 600,
              color: inCapTx ? CF.bullInk : CF.ink2, marginBottom: 4,
            }}>
              {inCapTx
                ? 'Cap honored. Tx confirmed.'
                : running ? 'Attempting…' : 'Pending'}
            </div>
            {inCapTx ? (
              <a href={BASESCAN(inCapTx)} target="_blank" rel="noreferrer" className="mono" style={{
                fontSize: 11, color: CF.bull, fontWeight: 500,
              }}>
                {inCapTx.slice(0, 12)}…{inCapTx.slice(-6)} ↗
              </a>
            ) : null}
          </div>
          {/* OVER-CAP revert (the hero) */}
          <div style={{
            padding: '14px 16px', borderRadius: CF.radius.md,
            background: overCapReason ? CF.bearTint : CF.surface2,
            border: `1px solid ${overCapReason ? CF.bear + '40' : CF.line}`,
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: CF.ink3, marginBottom: 6 }}>
              [B] OVER-CAP — 60 USDC vs 50 USDC CAP
            </div>
            <div style={{
              fontFamily: CF.body, fontSize: 14, fontWeight: 600,
              color: overCapReason ? CF.bearInk : CF.ink2, marginBottom: 4,
            }}>
              {overCapReason
                ? 'Refused by enforcer ✓'
                : running ? 'Attempting…' : 'Pending'}
            </div>
            {overCapReason ? (
              <div className="mono" style={{
                fontSize: 11, color: CF.bearInk, lineHeight: 1.5, wordBreak: 'break-word',
              }}>
                {overCapReason.length > 160 ? overCapReason.slice(0, 160) + '…' : overCapReason}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* log */}
      {lines.length > 0 ? (
        <div style={{
          padding: '14px 16px',
          background: CF.surface2,
          border: `1px solid ${CF.line}`, borderRadius: CF.radius.md,
          fontFamily: CF.mono, fontSize: 12, color: CF.ink,
          lineHeight: 1.6, maxHeight: 280, overflow: 'auto',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{
              padding: '3px 0',
              color: l.kind === 'good' ? CF.bull : l.kind === 'bad' ? CF.bear : CF.ink,
            }}>
              {l.text}
              {l.tx ? (
                <a href={BASESCAN(l.tx)} target="_blank" rel="noreferrer" style={{
                  marginLeft: 8, color: CF.ink3,
                }}>
                  {l.tx.slice(0, 10)}… ↗
                </a>
              ) : null}
            </div>
          ))}
          {running ? (
            <div style={{ color: CF.amber, marginTop: 4 }}>· running…</div>
          ) : null}
        </div>
      ) : (
        <div className="mono" style={{ fontSize: 11.5, color: CF.ink3 }}>
          Full proof takes ~20–40s · runs on Base Sepolia · costs &lt; 1 USDC.
        </div>
      )}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 16px', borderRadius: CF.radius.md, border: 'none',
  background: CF.ink, color: CF.bg,
  fontFamily: CF.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 16px', borderRadius: CF.radius.md,
  background: CF.surface, color: CF.ink,
  border: `1px solid ${CF.line2}`,
  fontFamily: CF.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
