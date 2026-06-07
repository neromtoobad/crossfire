'use client'

// RelayLive — editorial-light treatment.

import { useEffect, useRef, useState } from 'react'
import { CF, alpha } from '../lib/theme'

type LogLine = { kind: 'info' | 'good' | 'bad'; text: string; tx?: string; status?: string }
type WebhookConfig = { url: string; source: string } | null

const BASESCAN_MAINNET = (h: string) => `https://basescan.org/tx/${h}`

export function RelayLive({ onDone }: { onDone?: () => void } = {}) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(null)
  const [webhookHits, setWebhookHits] = useState<number>(0)
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<LogLine[]>([])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'confirmed' | 'reverted' | 'rejected' | 'error'>(null)
  const [resultTx, setResultTx] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Spine hook: notify a parent once the mainnet relay confirms.
  useEffect(() => {
    if (done === 'confirmed') onDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  useEffect(() => {
    fetch('/api/relay/run')
      .then((r) => r.json())
      .then((j) => {
        setEnabled(j.enabled)
        setWebhookConfig(j.webhook ?? null)
      })
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
        return { kind: 'good', text: `✓ submitted to relayer · TaskId ${String(e.taskId).slice(0,12)}… · webhook ${e.webhook ? 'subscribed' : '(polling)'}` }
      case 'status-tick':
        return { kind: 'info', text: `· status: ${e.statusName} (${e.status})`, status: e.statusName }
      case 'webhook-config':
        return e.url
          ? { kind: 'info', text: `· webhook listener configured · ${e.source === 'env' ? 'env' : 'tunnel'} → ${e.url}` }
          : { kind: 'info', text: `· no webhook URL configured — falling back to polling only` }
      case 'webhook-received':
        return {
          kind: 'good',
          text: `↩ WEBHOOK from 1Shot · status ${e.status}${e.txHash ? ` · tx ${String(e.txHash).slice(0,10)}…` : ''}`,
          tx: e.txHash,
        }
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
    setLines([]); setTaskId(null); setStatus(null); setDone(null); setResultTx(null)
    setWebhookHits(0)
    setRunning(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch('/api/relay/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), signal: ctrl.signal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text()
        push({ kind: 'bad', text: `× HTTP ${res.status}: ${text.slice(0, 160)}` })
        setDone('error'); setRunning(false); return
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
          if (evt.type === 'webhook-received') setWebhookHits((n) => n + 1)
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
    : CF.ink3

  return (
    <div style={{
      background: CF.surface,
      border: `1px solid ${CF.line}`,
      borderRadius: CF.radius.lg,
      boxShadow: CF.shadow.card,
      padding: '24px 24px 22px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 16,
      }}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div className="mono" style={{
            fontSize: 10.5, color: CF.gold, letterSpacing: 2, marginBottom: 8,
          }}>
            ▸ 1SHOT · BASE MAINNET RELAY
          </div>
          <div style={{
            fontFamily: CF.display, fontSize: 26, fontWeight: 500,
            letterSpacing: -0.6, color: CF.ink, lineHeight: 1.15,
            fontVariationSettings: '"opsz" 48',
          }}>
            Relay a real 7710 tx through 1Shot
          </div>
          <p style={{
            fontFamily: CF.body, fontSize: 14, color: CF.ink2,
            marginTop: 8, marginBottom: 10, maxWidth: 580, lineHeight: 1.55,
          }}>
            One click: USER EOA signs a capped USDC delegation + an in-flight
            EIP-7702 authorization upgrading to a Stateless7702 delegator. 1Shot
            redeems it, pays the fee in USDC, and broadcasts on Base mainnet.
            Gas paid in USDC, no ETH needed.
          </p>
          {/* Webhook listener status */}
          {webhookConfig ? (
            <div className="mono" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 10px', borderRadius: 999,
              background: CF.bullTint, color: CF.bullInk,
              border: `1px solid ${alpha(CF.bull, 20)}`,
              fontSize: 10.5, letterSpacing: 0.3, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: CF.bull }} />
              WEBHOOK LISTENING · {webhookConfig.source.toUpperCase()}
              {webhookHits > 0 ? <span style={{ color: CF.bull }}>· {webhookHits} received</span> : null}
            </div>
          ) : (
            <div className="mono" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 10px', borderRadius: 999,
              background: CF.surface2, color: CF.ink3,
              border: `1px dashed ${CF.line2}`,
              fontSize: 10.5, letterSpacing: 0.3,
            }}>
              webhook not configured · polling only · `npm run tunnel` to enable
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {enabled === null ? (
            <span className="mono" style={{ color: CF.ink3, fontSize: 11 }}>checking…</span>
          ) : !enabled ? (
            <span className="mono" style={{
              padding: '6px 10px', borderRadius: 999,
              border: `1px dashed ${CF.line2}`, color: CF.ink3,
              fontSize: 10.5,
            }}>
              disabled · set CROSSFIRE_ENABLE_MAINNET_RELAY=true
            </span>
          ) : running ? (
            <button onClick={cancel} style={btnSecondary}>Stop polling</button>
          ) : (
            <button onClick={start} style={btnPrimary}>
              Relay via 1Shot
            </button>
          )}
        </div>
      </div>

      {(running || taskId || done) ? (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
          padding: '12px 14px', marginBottom: 10,
          background: CF.surface2, border: `1px solid ${CF.line}`, borderRadius: CF.radius.md,
          fontFamily: CF.mono, fontSize: 11.5, fontVariantNumeric: 'tabular-nums',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: CF.ink2 }}>
            <span>chain: <span style={{ color: CF.ink, fontWeight: 600 }}>Base mainnet</span></span>
            <span>fee: <span style={{ color: CF.ink, fontWeight: 600 }}>USDC</span></span>
            <span>auth: <span style={{ color: CF.ink, fontWeight: 600 }}>EIP-7702 (in-flight)</span></span>
            {taskId ? (
              <span>task: <span style={{ color: CF.ink, fontWeight: 600 }}>{taskId.slice(0,12)}…</span></span>
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
                color: CF.bull, marginLeft: 4,
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
          background: CF.surface2,
          border: `1px solid ${CF.line}`, borderRadius: CF.radius.md,
          fontFamily: CF.mono, fontSize: 12, color: CF.ink,
          lineHeight: 1.6, maxHeight: 340, overflow: 'auto',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{
              padding: '3px 0',
              color: l.kind === 'good' ? CF.bull : l.kind === 'bad' ? CF.bear : CF.ink,
            }}>
              {l.text}
              {l.tx ? (
                <a href={BASESCAN_MAINNET(l.tx)} target="_blank" rel="noreferrer" style={{
                  marginLeft: 8, color: CF.ink3,
                }}>
                  {l.tx.slice(0, 10)}… ↗
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : enabled ? (
        <div className="mono" style={{ fontSize: 11.5, color: CF.ink3 }}>
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
