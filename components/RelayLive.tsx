'use client'

// Phase 8.10 — 1Shot mainnet relay button.
//
// One click submits a REAL relay on Base mainnet:
//   - USER (in-flight EIP-7702 upgrade to Stateless7702Delegator) signs an
//     Erc20TransferAmount delegation to 1Shot's target, capped at 3 USDC
//   - The relayer settles the fee + a 0.001 USDC work transfer
//   - We poll relayer_getStatus until Confirmed and show the basescan link
//
// Gated server-side by CROSSFIRE_ENABLE_MAINNET_RELAY=true. When disabled,
// the button shows the enablement hint instead of firing.

import { useEffect, useRef, useState } from 'react'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45', white: '#ffffff',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

type LogLine = { kind: 'info' | 'good' | 'bad'; text: string; tx?: string; status?: string }

const BASESCAN_MAINNET = (h: string) => `https://basescan.org/tx/${h}`
const BASESCAN_ADDR = (a: string) => `https://basescan.org/address/${a}`

export function RelayLive() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<LogLine[]>([])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'confirmed' | 'reverted' | 'rejected' | 'error'>(null)
  const [resultTx, setResultTx] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    fetch('/api/relay/run').then((r) => r.json()).then((j) => setEnabled(j.enabled))
      .catch(() => setEnabled(false))
  }, [])

  function push(line: LogLine) { setLines((cur) => [...cur, line]) }

  function eventToLine(e: any): LogLine | null {
    switch (e.type) {
      case 'started':
        return { kind: 'info', text: `▸ relay started · USER ${e.userAddress.slice(0,8)}… · bal ${e.usdcBal} USDC · ETH ${Number(e.ethBal).toFixed(4)}` }
      case 'capabilities':
        return { kind: 'info', text: `· relayer target ${e.targetAddress.slice(0,8)}… · feeCollector ${e.feeCollector.slice(0,8)}…` }
      case 'fee-quoted':
        return { kind: 'info', text: `· fee quote · minFee ${e.minFee} atoms · rate ${e.rate}` }
      case 'delegation-signed':
        return { kind: 'good', text: `✓ delegation signed · cap ${e.cap} USDC · USDC only · → relayer` }
      case '7702-signed':
        return { kind: 'good', text: `✓ EIP-7702 authorization signed · upgrades EOA → Stateless7702 impl · nonce ${e.nonce}` }
      case 'estimated':
        return { kind: 'good', text: `✓ estimate succeeded · required payment ${e.requiredPayment} atoms USDC` }
      case 'submitted':
        return { kind: 'good', text: `✓ submitted to relayer · TaskId ${String(e.taskId).slice(0,12)}… · webhook ${e.webhook ?? '(polling)'}` }
      case 'status-tick':
        return { kind: 'info', text: `· status: ${e.statusName} (${e.status})`, status: e.statusName }
      case 'terminal':
        return {
          kind: e.isSuccess ? 'good' : 'bad',
          text: e.isSuccess
            ? `✓ CONFIRMED on Base mainnet · gas paid in USDC`
            : `× terminal ${e.statusName} (${e.status}) · ${e.message ?? 'no message'}`,
          tx: e.txHash,
        }
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
    if (running || !enabled) return
    setLines([])
    setTaskId(null)
    setStatus(null)
    setDone(null)
    setResultTx(null)
    setRunning(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch('/api/relay/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text()
        push({ kind: 'bad', text: `× HTTP ${res.status}: ${text.slice(0, 160)}` })
        setDone('error')
        setRunning(false)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done: isDone } = await reader.read()
        if (isDone) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const raw of lines) {
          const line = raw.trim()
          if (!line) continue
          let evt: any
          try { evt = JSON.parse(line) } catch { continue }
          if (evt.type === 'submitted') setTaskId(evt.taskId)
          if (evt.type === 'status-tick') setStatus(evt.statusName)
          if (evt.type === 'terminal') {
            setStatus(evt.statusName)
            if (evt.txHash) setResultTx(evt.txHash)
            setDone(
              evt.isSuccess ? 'confirmed'
              : evt.status === 400 ? 'rejected'
              : evt.status === 500 ? 'reverted'
              : 'error',
            )
          }
          if (evt.type === 'error') setDone((d) => d ?? 'error')
          const ln = eventToLine(evt)
          if (ln) push(ln)
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        push({ kind: 'bad', text: `× stream error: ${e?.message ?? e}` })
        setDone('error')
      }
    } finally {
      setRunning(false)
    }
  }

  function cancel() { abortRef.current?.abort() }

  const statusColor =
    done === 'confirmed' ? CF.bull
    : done === 'reverted' || done === 'rejected' || done === 'error' ? CF.bear
    : running ? CF.amber
    : CF.dim

  return (
    <div style={{
      background: CF.panel,
      border: `1px solid ${CF.edge}`,
      borderRadius: 12,
      padding: '22px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.amber, letterSpacing: 1.8, marginBottom: 6 }}>
            ▸ 1SHOT · BASE MAINNET RELAY
          </div>
          <div style={{ fontFamily: CF.display, fontSize: 18, fontWeight: 600, color: CF.text }}>
            Relay a real 7710 tx through 1Shot
          </div>
          <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim, marginTop: 4, maxWidth: 580, lineHeight: 1.55 }}>
            One click: USER EOA signs a capped USDC delegation + an in-flight EIP-7702 authorization upgrading to a Stateless7702 delegator. 1Shot redeems it, pays itself the fee in USDC, and broadcasts on Base mainnet. Gas paid in USDC, no ETH needed.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {enabled === null ? (
            <span style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 11 }}>checking…</span>
          ) : !enabled ? (
            <span style={{
              padding: '6px 10px', borderRadius: 999,
              border: `1px solid ${CF.dimmer}`, color: CF.dim,
              fontFamily: CF.mono, fontSize: 10.5,
            }}>
              disabled · set CROSSFIRE_ENABLE_MAINNET_RELAY=true
            </span>
          ) : running ? (
            <button onClick={cancel} style={btnSecondary()}>Stop polling</button>
          ) : (
            <button onClick={start} style={btnPrimary()}>
              Relay via 1Shot
            </button>
          )}
        </div>
      </div>

      {/* status strip */}
      {(running || taskId || done) ? (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          padding: '10px 14px', marginBottom: 10,
          background: CF.bg, border: `1px solid ${CF.edge}`, borderRadius: 8,
          fontFamily: CF.mono, fontSize: 11.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: CF.dim }}>chain: <span style={{ color: CF.text }}>Base mainnet</span></span>
            <span style={{ color: CF.dim }}>fee asset: <span style={{ color: CF.text }}>USDC</span></span>
            <span style={{ color: CF.dim }}>auth: <span style={{ color: CF.text }}>EIP-7702 (in-flight)</span></span>
            {taskId ? (
              <span style={{ color: CF.dim }}>task: <span style={{ color: CF.text }}>{taskId.slice(0,12)}…</span></span>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: statusColor,
              animation: running ? 'cf-relay-pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ color: statusColor, fontWeight: 600 }}>
              {done === 'confirmed' ? 'CONFIRMED'
                : done === 'reverted' ? 'REVERTED'
                : done === 'rejected' ? 'REJECTED'
                : done === 'error' ? 'ERROR'
                : status ?? (running ? 'Working…' : 'Idle')}
            </span>
            {resultTx ? (
              <a href={BASESCAN_MAINNET(resultTx)} target="_blank" rel="noreferrer" style={{
                color: CF.bull, textDecoration: 'none', marginLeft: 4,
              }}>
                {resultTx.slice(0, 10)}… ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {lines.length > 0 ? (
        <div style={{
          padding: '14px 16px',
          background: '#06060a', border: `1px solid ${CF.edge}`, borderRadius: 9,
          fontFamily: CF.mono, fontSize: 12, color: CF.text, lineHeight: 1.55,
          maxHeight: 340, overflow: 'auto',
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{
              padding: '3px 0',
              color: l.kind === 'good' ? CF.bull : l.kind === 'bad' ? CF.bear : CF.text,
            }}>
              {l.text}
              {l.tx ? (
                <a href={BASESCAN_MAINNET(l.tx)} target="_blank" rel="noreferrer" style={{
                  marginLeft: 8, color: CF.dim, textDecoration: 'none',
                }}>
                  {l.tx.slice(0, 10)}… ↗
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : enabled ? (
        <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dimmer }}>
          Costs ~0.5–2 USDC of real mainnet USDC per click · full relay completes in 30–60s.
        </div>
      ) : null}

      <style>{`
        @keyframes cf-relay-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.35; transform: scale(0.78); }
        }
      `}</style>
    </div>
  )
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 7, border: 'none',
    background: CF.text, color: '#000',
    fontFamily: CF.display, fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
    boxShadow: `0 0 18px color-mix(in oklab, ${CF.amber} 22%, transparent)`,
  }
}
function btnSecondary(): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 7,
    background: 'transparent', color: CF.text,
    border: `1px solid ${CF.edge}`,
    fontFamily: CF.display, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }
}
