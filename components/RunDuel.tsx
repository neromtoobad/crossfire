'use client'

// Phase 7.5 — live duel UI. Opens an NDJSON stream from /api/duel/run and
// renders Bull/Bear panels filling in real time.

import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from './ConnectButton'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45', white: '#ffffff',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

type Side = 'BULL' | 'BEAR'

type DuelEvent =
  | { type: 'started'; user: string; marketId: string; capUsdc: number }
  | { type: 'sub-budgets-signed'; bullCapUsdc: number; bearCapUsdc: number }
  | { type: 'side-evidence'; side: Side; n: number; signal: string; sourceUrl: string; txHash: string; usdcSpent: string }
  | { type: 'side-conviction'; side: Side; conviction: { side: 'YES' | 'NO'; estProb: number; edge: number; stakeUsdc: number; rationale: string } }
  | { type: 'netting'; bullStake: number; bearStake: number; netUsdc: number }
  | { type: 'abstain'; netUsdc: number; reason: string }
  | { type: 'bet-transfer'; side: 'YES' | 'NO'; amountUsdc: number; txHash: string }
  | { type: 'bet-credit'; side: 'YES' | 'NO'; amountUsdc: number; txHash: string }
  | { type: 'done'; outcome: any }
  | { type: 'error'; message: string }

type SideState = {
  cap: number
  evidence: Array<{ n: number; signal: string; txHash: string }>
  stake: number
  rationale: string
  edge: number
  estProb: number
}
const emptySide = (): SideState => ({ cap: 0, evidence: [], stake: 0, rationale: '', edge: 0, estProb: 0 })

export function RunDuel({
  marketId,
  marketTitle,
  capUsdc,
}: {
  marketId: string
  marketTitle: string
  capUsdc: number
}) {
  const { address, isConnected } = useAccount()
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [bull, setBull] = useState<SideState>(emptySide())
  const [bear, setBear] = useState<SideState>(emptySide())
  const [netting, setNetting] = useState<{ bull: number; bear: number; net: number } | null>(null)
  const [abstain, setAbstain] = useState<string | null>(null)
  const [betTx, setBetTx] = useState<string | null>(null)
  const [creditTx, setCreditTx] = useState<string | null>(null)
  const [decision, setDecision] = useState<'YES' | 'NO' | null>(null)
  const [creditAmount, setCreditAmount] = useState<number>(0)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  function pushLog(line: string) {
    setLog((l) => [...l, line])
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 10)
  }

  function reset() {
    setBull(emptySide()); setBear(emptySide())
    setNetting(null); setAbstain(null)
    setBetTx(null); setCreditTx(null)
    setDecision(null); setCreditAmount(0); setErrMsg(null)
    setLog([])
  }

  async function handle(e: DuelEvent) {
    switch (e.type) {
      case 'started':
        pushLog(`▸ Duel started · user ${e.user.slice(0, 8)}… · cap ${e.capUsdc} USDC`)
        break
      case 'sub-budgets-signed':
        setBull((s) => ({ ...s, cap: e.bullCapUsdc }))
        setBear((s) => ({ ...s, cap: e.bearCapUsdc }))
        pushLog(`▸ Sub-budgets signed · Bull ${e.bullCapUsdc} · Bear ${e.bearCapUsdc} USDC`)
        break
      case 'side-evidence': {
        const setter = e.side === 'BULL' ? setBull : setBear
        setter((s) => ({
          ...s,
          evidence: [...s.evidence, { n: e.n, signal: e.signal, txHash: e.txHash }],
        }))
        pushLog(`▸ ${e.side} bought evidence #${e.n} · signal ${e.signal} · spent ${e.usdcSpent} USDC`)
        break
      }
      case 'side-conviction': {
        const setter = e.side === 'BULL' ? setBull : setBear
        setter((s) => ({
          ...s,
          stake: e.conviction.stakeUsdc,
          rationale: e.conviction.rationale,
          edge: e.conviction.edge,
          estProb: e.conviction.estProb,
        }))
        pushLog(`▸ ${e.side} conviction · stake ${e.conviction.stakeUsdc.toFixed(2)} USDC · edge ${e.conviction.edge.toFixed(2)}`)
        break
      }
      case 'netting':
        setNetting({ bull: e.bullStake, bear: e.bearStake, net: e.netUsdc })
        pushLog(`▸ Net = ${e.netUsdc.toFixed(2)} USDC (Bull ${e.bullStake.toFixed(2)} − Bear ${e.bearStake.toFixed(2)})`)
        break
      case 'abstain':
        setAbstain(e.reason)
        pushLog(`▸ ABSTAIN · ${e.reason}`)
        break
      case 'bet-transfer':
        setBetTx(e.txHash)
        setDecision(e.side)
        pushLog(`▸ Bet transfer · ${e.side} ${e.amountUsdc.toFixed(2)} USDC · ${e.txHash.slice(0, 10)}…`)
        break
      case 'bet-credit':
        setCreditTx(e.txHash)
        setCreditAmount(e.amountUsdc)
        pushLog(`▸ Credited · ${e.amountUsdc.toFixed(2)} ${e.side} shares to your wallet`)
        break
      case 'done':
        setPhase('done')
        pushLog(`✓ Duel complete`)
        break
      case 'error':
        setPhase('error')
        setErrMsg(e.message)
        pushLog(`✗ Error · ${e.message}`)
        break
    }
  }

  async function start() {
    if (!isConnected || !address) {
      setErrMsg('Connect your wallet first')
      return
    }
    reset()
    setRunning(true)
    setPhase('streaming')
    pushLog(`Opening stream…`)

    try {
      const res = await fetch('/api/duel/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: address, marketId }),
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(`stream open failed (${res.status}): ${text.slice(0, 200)}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line) as DuelEvent
            await handle(evt)
          } catch {
            pushLog(`(unparseable line) ${line.slice(0, 80)}`)
          }
        }
      }
    } catch (e) {
      setErrMsg((e as Error).message)
      setPhase('error')
      pushLog(`✗ Stream error · ${(e as Error).message}`)
    } finally {
      setRunning(false)
    }
  }

  if (!isConnected) {
    return (
      <div style={panelStyle()}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.dim, marginBottom: 14 }}>
          CONNECT FIRST
        </div>
        <p style={{ fontFamily: CF.display, color: CF.dim, fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>
          Connect the wallet that signed the mandate for this market.
        </p>
        <ConnectButton variant="primary" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header bar */}
      <div style={{ ...panelStyle(), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6 }}>THE DUEL</div>
          <div style={{ fontFamily: CF.display, fontSize: 16, fontWeight: 600, color: CF.text, marginTop: 4 }}>
            {marketTitle}
          </div>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 4 }}>
            cap {capUsdc} USDC · sub-caps {capUsdc / 2} each
          </div>
        </div>
        <button
          onClick={start}
          disabled={running}
          style={{
            padding: '14px 22px', borderRadius: 9, border: 'none',
            background: running ? CF.dim : CF.text, color: '#000',
            fontFamily: CF.display, fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
            cursor: running ? 'not-allowed' : 'pointer',
            boxShadow: running ? 'none' : `0 0 24px color-mix(in oklab, ${CF.bull} 18%, transparent)`,
          }}
        >
          {running ? 'Running…' : phase === 'done' ? 'Run again' : 'Run the duel'}
        </button>
      </div>

      {/* Two side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SidePanel label="BULL · YES" color={CF.bull} state={bull} />
        <SidePanel label="BEAR · NO" color={CF.bear} state={bear} />
      </div>

      {/* Netting / decision panel */}
      <div style={panelStyle()}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6, marginBottom: 12 }}>
          NET RESULT
        </div>
        {netting ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap',
            }}>
              <div style={{ fontFamily: CF.display, fontSize: 32, fontWeight: 600 }}>
                <span style={{ color: CF.bull }}>{netting.bull.toFixed(2)}</span>
                <span style={{ color: CF.dim, padding: '0 12px' }}>−</span>
                <span style={{ color: CF.bear }}>{netting.bear.toFixed(2)}</span>
                <span style={{ color: CF.dim, padding: '0 12px' }}>=</span>
                <span style={{ color: netting.net > 0 ? CF.bull : netting.net < 0 ? CF.bear : CF.amber }}>
                  {netting.net > 0 ? '+' : ''}{netting.net.toFixed(2)}
                </span>
                <span style={{ color: CF.dim, fontSize: 14, marginLeft: 8 }}>USDC</span>
              </div>
              {decision ? (
                <span style={{
                  padding: '8px 14px', borderRadius: 999,
                  border: `1px solid ${decision === 'YES' ? CF.bull : CF.bear}`,
                  color: decision === 'YES' ? CF.bull : CF.bear,
                  background: `color-mix(in oklab, ${decision === 'YES' ? CF.bull : CF.bear} 14%, transparent)`,
                  fontFamily: CF.mono, fontWeight: 600, fontSize: 13, letterSpacing: 1,
                }}>
                  {decision} BET PLACED
                </span>
              ) : abstain ? (
                <span style={{
                  padding: '8px 14px', borderRadius: 999,
                  border: `1px solid ${CF.amber}`, color: CF.amber,
                  background: `color-mix(in oklab, ${CF.amber} 14%, transparent)`,
                  fontFamily: CF.mono, fontWeight: 600, fontSize: 13, letterSpacing: 1,
                }}>
                  ABSTAIN
                </span>
              ) : null}
            </div>
            {abstain ? (
              <div style={{ fontFamily: CF.mono, fontSize: 11.5, color: CF.amber, marginTop: 10 }}>
                {abstain}
              </div>
            ) : null}
            {betTx ? (
              <div style={{ marginTop: 14, fontFamily: CF.mono, fontSize: 11.5, color: CF.dim, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <span>
                  bet transfer ·{' '}
                  <a href={`https://sepolia.basescan.org/tx/${betTx}`} target="_blank" rel="noreferrer" style={{ color: CF.bull }}>
                    {betTx.slice(0, 10)}…{betTx.slice(-6)}
                  </a>
                </span>
                {creditTx ? (
                  <span>
                    credited {creditAmount.toFixed(2)} shares ·{' '}
                    <a href={`https://sepolia.basescan.org/tx/${creditTx}`} target="_blank" rel="noreferrer" style={{ color: CF.bull }}>
                      {creditTx.slice(0, 10)}…{creditTx.slice(-6)}
                    </a>
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ fontFamily: CF.mono, fontSize: 12, color: CF.dim }}>
            {running ? 'agents are reasoning…' : 'press Run to start the duel'}
          </div>
        )}
      </div>

      {/* Live log */}
      <div style={panelStyle()}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6, marginBottom: 10 }}>
          LIVE LOG
        </div>
        <div
          ref={logRef}
          style={{
            maxHeight: 220, overflowY: 'auto',
            fontFamily: CF.mono, fontSize: 11.5, color: CF.dim, lineHeight: 1.7,
          }}
        >
          {log.length === 0 ? (
            <div style={{ color: CF.dimmer }}>no events yet</div>
          ) : (
            log.map((l, i) => (
              <div key={i} style={{ color: l.startsWith('✓') ? CF.bull : l.startsWith('✗') ? CF.bear : CF.dim }}>
                {l}
              </div>
            ))
          )}
        </div>
      </div>

      {errMsg ? (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: `color-mix(in oklab, ${CF.bear} 12%, transparent)`,
          border: `1px solid ${CF.bear}`, color: CF.bear,
          fontFamily: CF.mono, fontSize: 12,
        }}>
          {errMsg}
        </div>
      ) : null}
    </div>
  )
}

function SidePanel({ label, color, state }: { label: string; color: string; state: SideState }) {
  const pct = state.cap > 0 ? Math.min(100, (state.stake / state.cap) * 100) : 0
  return (
    <div style={panelStyle()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontFamily: CF.display, fontSize: 12, fontWeight: 700, color, letterSpacing: 2.4 }}>
          {label}
        </span>
        <span style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim }}>
          cap {state.cap || '—'} USDC
        </span>
      </div>
      <div style={{ fontFamily: CF.mono, fontSize: 32, fontWeight: 600, color: CF.text, letterSpacing: -0.5 }}>
        {state.stake.toFixed(2)}<span style={{ color: CF.dim, fontSize: 14, marginLeft: 6 }}>USDC</span>
      </div>
      <div style={{ height: 6, background: CF.edge, borderRadius: 6, overflow: 'hidden', marginTop: 8, marginBottom: 14 }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          boxShadow: `0 0 10px color-mix(in oklab, ${color} 55%, transparent)`,
          transition: 'width 400ms',
        }} />
      </div>

      {state.evidence.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          {state.evidence.map((ev, i) => (
            <div key={i} style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, padding: '2px 0' }}>
              evidence #{ev.n} · {ev.signal} ·{' '}
              <a href={`https://sepolia.basescan.org/tx/${ev.txHash}`} target="_blank" rel="noreferrer" style={{ color: CF.dim }}>
                {ev.txHash.slice(0, 8)}…
              </a>
            </div>
          ))}
        </div>
      ) : null}

      {state.rationale ? (
        <div style={{
          padding: '10px 12px', background: CF.bg, borderRadius: 6,
          fontFamily: CF.display, fontSize: 12, color: CF.dim, lineHeight: 1.5,
        }}>
          {state.rationale}
        </div>
      ) : null}

      {state.edge !== 0 ? (
        <div style={{ marginTop: 10, fontFamily: CF.mono, fontSize: 10.5, color: CF.dim }}>
          estProb {state.estProb.toFixed(2)} · edge {state.edge.toFixed(2)}
        </div>
      ) : null}
    </div>
  )
}

function panelStyle(): React.CSSProperties {
  return {
    background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
    padding: '18px 20px',
  }
}
