'use client'

// Phase 8.8 — visible "watch a call get made" demo button.
//
// User picks a market → server streams CouncilEvent objects → we render
// them as a vertical log with on-chain tx links. Every kit/Venice/x402/A2A
// piece shows up here in plain English:
//   - "started" : market context
//   - "role-evidence" × 4 : x402 evidence buys with real tx hashes
//   - "role-vote" × 4 : per-agent vote + one-liner
//   - "skeptic-verdict" : adversarial check
//   - "gate-decision" : pass/fail with reasons
//   - "thesis-generated" : Venice produced the written thesis
//   - "bond-posted" : ERC-7710 redelegation chain redeemed on-chain
//   - "published" : new card lands in the feed
//
// On 'published' or 'refused' we revalidate the page so the new call appears.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45', white: '#ffffff',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

export type MarketChoice = { id: string; title: string }

type LogLine = {
  ts: number
  kind: 'info' | 'good' | 'bad' | 'note'
  text: string
  txHash?: string
  agent?: string
}

const BASESCAN_TX = (h: string) => `https://sepolia.basescan.org/tx/${h}`

export function RunCouncilLive({ markets }: { markets: MarketChoice[] }) {
  const [marketId, setMarketId] = useState(markets[0]?.id ?? '')
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<LogLine[]>([])
  const [doneState, setDoneState] = useState<null | 'published' | 'refused' | 'error'>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()

  function push(line: LogLine) {
    setLines((cur) => [...cur, line])
  }

  function eventToLine(e: any): LogLine | null {
    const ts = Date.now()
    switch (e.type) {
      case 'started':
        return { ts, kind: 'info', text: `▸ council started · market: "${e.marketTitle}" · implied YES ${(e.impliedProbYes * 100).toFixed(0)}%` }
      case 'treasury-mandate-signed':
        return { ts, kind: 'good', text: `✓ treasury mandate signed (USER SA → orchestrator, ERC-7710)` }
      case 'role-evidence':
        return {
          ts, kind: 'good', agent: e.role,
          text: `· ${e.role} bought evidence · signal=${e.signal} · spent ${e.usdcSpent} USDC via x402`,
          txHash: e.txHash,
        }
      case 'role-vote':
        return {
          ts, kind: 'info', agent: e.vote.role,
          text: `· ${e.vote.role} votes ${e.vote.vote} @ ${(e.vote.confidence * 100).toFixed(0)}% — ${e.vote.oneLiner}`,
        }
      case 'majority':
        return { ts, kind: 'info', text: `▸ majority side ${e.side} · ${e.agreeing}/${e.total} role agents agreed` }
      case 'skeptic-verdict':
        return {
          ts, kind: 'info', agent: 'Skeptic',
          text: `· Skeptic refutation @ ${(e.vote.confidence * 100).toFixed(0)}% — ${e.vote.oneLiner}`,
        }
      case 'gate-decision':
        return {
          ts, kind: e.passed ? 'good' : 'bad',
          text: e.passed
            ? `✓ quality gate PASSED — proceeding to publish`
            : `✗ quality gate FAILED — ${e.reasons.join(' · ')}`,
        }
      case 'thesis-generated':
        return { ts, kind: 'good', text: `✓ Venice produced the written thesis` }
      case 'bond-posted':
        return {
          ts, kind: 'good',
          text: `✓ bond posted on-chain · ${e.bondUsdc.toFixed(2)} USDC → ${e.bondHolder.slice(0, 8)}…`,
          txHash: e.txHash,
        }
      case 'published':
        return { ts, kind: 'good', text: `✓ PUBLISHED: ${e.call.marketTitle} · side ${e.call.side} @ ${(e.call.selectedSideProb * 100).toFixed(0)}%` }
      case 'refused':
        return { ts, kind: 'bad', text: `× council REFUSED to publish — ${e.reason}` }
      case 'error':
        return { ts, kind: 'bad', text: `× error: ${e.message}` }
      case 'heartbeat':
      case 'done':
        return null
      default:
        return { ts, kind: 'note', text: `· ${e.type}` }
    }
  }

  async function start() {
    if (!marketId || running) return
    setLines([])
    setDoneState(null)
    setRunning(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/council/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) {
        push({ ts: Date.now(), kind: 'bad', text: `× HTTP ${res.status}` })
        setRunning(false)
        setDoneState('error')
        return
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
        for (const raw of lines) {
          const line = raw.trim()
          if (!line) continue
          let evt: any
          try { evt = JSON.parse(line) } catch { continue }
          if (evt.type === 'published') setDoneState('published')
          else if (evt.type === 'refused') setDoneState('refused')
          else if (evt.type === 'error') setDoneState((s) => s ?? 'error')
          const ln = eventToLine(evt)
          if (ln) push(ln)
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        push({ ts: Date.now(), kind: 'bad', text: `× stream error: ${e?.message ?? e}` })
        setDoneState('error')
      }
    } finally {
      setRunning(false)
      router.refresh()
    }
  }

  function cancel() {
    abortRef.current?.abort()
  }

  return (
    <div style={{
      background: CF.panel,
      border: `1px solid ${CF.edge}`,
      borderRadius: 12,
      padding: '22px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.bull, letterSpacing: 1.8, marginBottom: 6 }}>
            ▸ LIVE COUNCIL
          </div>
          <div style={{ fontFamily: CF.display, fontSize: 18, fontWeight: 600, color: CF.text }}>
            Watch a call get made
          </div>
          <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim, marginTop: 4, maxWidth: 560, lineHeight: 1.55 }}>
            Pick a market, hit Run. The orchestrator redelegates to each role agent, buys evidence via x402, runs Venice, and only posts an on-chain USDC bond if the quality gate passes.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            disabled={running}
            style={{
              padding: '10px 12px', background: CF.bg, color: CF.text,
              border: `1px solid ${CF.edge}`, borderRadius: 7,
              fontFamily: CF.mono, fontSize: 12, minWidth: 220,
            }}
          >
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.title.slice(0, 56)}</option>
            ))}
          </select>
          {running ? (
            <button onClick={cancel} style={btnSecondary()}>Cancel</button>
          ) : (
            <button onClick={start} disabled={!marketId} style={btnPrimary(!marketId)}>
              Run council
            </button>
          )}
        </div>
      </div>

      {lines.length > 0 ? (
        <div style={{
          marginTop: 12, padding: '14px 16px',
          background: '#06060a', border: `1px solid ${CF.edge}`, borderRadius: 9,
          fontFamily: CF.mono, fontSize: 12, color: CF.text, lineHeight: 1.55,
          maxHeight: 360, overflow: 'auto',
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{
              padding: '3px 0',
              color: l.kind === 'good' ? CF.bull : l.kind === 'bad' ? CF.bear : l.kind === 'note' ? CF.dim : CF.text,
            }}>
              {l.text}
              {l.txHash ? (
                <a href={BASESCAN_TX(l.txHash)} target="_blank" rel="noreferrer" style={{
                  marginLeft: 8, color: CF.dim, textDecoration: 'none',
                }}>
                  {l.txHash.slice(0, 10)}… ↗
                </a>
              ) : null}
            </div>
          ))}
          {running ? (
            <div style={{ color: CF.amber, marginTop: 4 }}>· streaming…</div>
          ) : doneState === 'published' ? (
            <div style={{ color: CF.bull, marginTop: 6 }}>✓ done — feed updated above</div>
          ) : doneState === 'refused' ? (
            <div style={{ color: CF.amber, marginTop: 6 }}>· council declined to publish — this is the system working correctly</div>
          ) : doneState === 'error' ? (
            <div style={{ color: CF.bear, marginTop: 6 }}>× stopped on error — see line above</div>
          ) : null}
        </div>
      ) : (
        <div style={{
          fontFamily: CF.mono, fontSize: 11, color: CF.dimmer, marginTop: 6,
        }}>
          A full run takes roughly 60–90s · evidence buys settle on Base Sepolia · costs ~2–9 USDC per published call.
        </div>
      )}
    </div>
  )
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 7, border: 'none',
    background: disabled ? CF.dim : CF.text, color: '#000',
    fontFamily: CF.display, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : `0 0 18px color-mix(in oklab, ${CF.bull} 18%, transparent)`,
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
