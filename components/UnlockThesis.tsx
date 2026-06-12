'use client'

// Phase 8.5, user-side x402 unlock flow.
//
// On click:
//   1. fetch GET /api/unlock/[callId]?user=… → check if already unlocked
//   2. if not: fetch POST /api/unlock/[callId] (no body) → 402 + PAYMENT-REQUIRED
//   3. build a fresh open delegation from user → facilitator, capped at unlock price
//   4. user signs the delegation via wagmi useSignTypedData (kit-in-main-flow)
//   5. base64-encode the paymentPayload, POST again with PAYMENT-SIGNATURE
//   6. server settles (real USDC moves), returns the locked thesis
//
// Renders nothing if already unlocked (parent will render the thesis).

import { useEffect, useState } from 'react'
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { erc20Abi, encodeFunctionData } from 'viem'
import { ConnectButton } from './ConnectButton'
import { PUBLIC } from '../lib/public-config'
import type { PublishedCall } from '../lib/calls-data'
import { CF } from '../lib/theme'

type Unlocked = {
  thesis: string
  evidenceUrls: PublishedCall['locked']['evidenceUrls']
  sizingRationale: string
  counterarguments: string
}

type ErrorCause = 'rejected' | 'network' | 'settlement' | 'wallet-internal' | 'wrong-chain' | 'unknown'

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'signing' }
  | { kind: 'settling' }
  | { kind: 'unlocked'; data: Unlocked; tx?: string }
  | { kind: 'error'; message: string; cause: ErrorCause; detail?: string }

// Map a thrown error to a user-readable cause. Wagmi/viem surface
// rejection with code 4001 / class names; -32603 is the JSON-RPC
// "internal error" code MetaMask returns when the wallet can't process
// the request, most often a chain mismatch or a locked wallet.
// Friendly chain label for the wrong-chain banner.
function chainLabel(id: number): string {
  const known: Record<number, string> = {
    1: 'Ethereum mainnet (chainId 1)',
    10: 'Optimism (chainId 10)',
    137: 'Polygon (chainId 137)',
    42161: 'Arbitrum One (chainId 42161)',
    8453: 'Base mainnet (chainId 8453)',
    84532: 'Base Sepolia (chainId 84532)',
    11155111: 'Ethereum Sepolia (chainId 11155111)',
  }
  return `Your wallet is on ${known[id] ?? `chainId ${id}`}`
}

function classifyError(e: unknown): { cause: ErrorCause; message: string; detail?: string } {
  const err = e as { code?: number; name?: string; shortMessage?: string; message?: string; details?: string; cause?: { code?: number; name?: string; message?: string } }
  const code = err?.code ?? err?.cause?.code
  const name = err?.name ?? err?.cause?.name ?? ''
  const msg = err?.shortMessage ?? err?.message ?? String(e)
  const detail = [err?.details, err?.cause?.message].filter(Boolean).join(' · ')

  if (code === 4001 || /User rejected|UserRejectedRequest/i.test(name) || /user rejected|user denied/i.test(msg)) {
    return { cause: 'rejected', message: 'You cancelled the signature in your wallet.', detail }
  }
  if (/wrong chain|chain mismatch|unrecognized chain|switch chain/i.test(msg)) {
    return {
      cause: 'wrong-chain',
      message: 'Your wallet is on the wrong chain. Switch to Base Sepolia (84532) and try again.',
      detail,
    }
  }
  if (code === -32603 || /Internal error|internal JSON-RPC error|invalid argument 0/i.test(msg)) {
    return {
      cause: 'wallet-internal',
      message:
        'Your wallet returned an internal error. Most common causes: (1) wallet is on the wrong chain, switch to Base Sepolia (84532); (2) wallet is locked, unlock it and retry; (3) MetaMask needs a refresh, try closing and reopening the extension.',
      detail: detail || msg.slice(0, 240),
    }
  }
  if (/settlement failed/i.test(msg)) {
    return { cause: 'settlement', message: msg.replace(/^settlement failed:?\s*/i, ''), detail }
  }
  if (/fetch|network|aborted|timeout|failed to fetch/i.test(msg)) {
    return { cause: 'network', message: 'Network error reaching the unlock endpoint. Check your connection and try again.', detail }
  }
  return { cause: 'unknown', message: msg.slice(0, 240), detail }
}

export function UnlockThesis({ call }: { call: PublishedCall }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { address, status: accountStatus, connector } = useAccount()
  const wagmiChainId = useChainId() // wagmi's view, can be stale vs the actual provider
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  // ── Live provider chain (ground truth) ────────────────────────────────
  // Read from the ACTUAL connected wallet's provider, not window.ethereum,
  // which can be a different installed wallet (or absent for an embedded wallet)
  // and falsely report the wrong chain. Falls back to wagmi.
  const [providerChainId, setProviderChainId] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    let prov: any
    const toNum = (h: any) => { const n = typeof h === 'string' ? parseInt(h, 16) : Number(h); return Number.isFinite(n) && n > 0 ? n : null }
    const onChanged = (h: any) => setProviderChainId(toNum(h))
    ;(async () => {
      try {
        prov = (await (connector as any)?.getProvider?.()) ?? (typeof window !== 'undefined' ? (window as any).ethereum : undefined)
        if (!prov?.request) return
        const h = await prov.request({ method: 'eth_chainId' })
        if (!cancelled) setProviderChainId(toNum(h))
        prov.on?.('chainChanged', onChanged)
      } catch { /* fall back to wagmiChainId */ }
    })()
    return () => { cancelled = true; try { prov?.removeListener?.('chainChanged', onChanged) } catch {} }
  }, [connector, accountStatus])
  // Chain gate REMOVED, unreliable detection kept false-flagging Base Sepolia.
  // The payment tx specifies chain: baseSepolia, so the wallet handles any switch.
  const chainId = providerChainId ?? wagmiChainId // kept for the (now unused) diagnostics
  const isConnected = accountStatus === 'connected'
  const isReconnecting = accountStatus === 'reconnecting' || accountStatus === 'connecting'
  const wrongChain = false

  const [state, setState] = useState<State>({ kind: 'idle' })

  // On wallet connect, check if we've already unlocked this call.
  useEffect(() => {
    if (!isConnected || !address) return
    setState({ kind: 'checking' })
    ;(async () => {
      try {
        const r = await fetch(`/api/unlock/${call.id}?user=${address}`)
        if (r.ok) {
          const j = await r.json()
          if (j.unlocked && j.locked) {
            setState({ kind: 'unlocked', data: j.locked, tx: j.unlock?.settlementTxHash })
            return
          }
        }
        setState({ kind: 'idle' })
      } catch {
        setState({ kind: 'idle' })
      }
    })()
  }, [isConnected, address, call.id])

  // Switch chains. Reads the provider directly because wagmi's switchChain
  // can short-circuit if its (stale) state says we're already on the target.
  async function handleSwitchChain() {
    const targetHex = `0x${PUBLIC.chainId.toString(16)}` // 0x14a34
    // 1) wagmi's cross-connector switch (MetaMask, embedded, WalletConnect…).
    try {
      await switchChainAsync({ chainId: PUBLIC.chainId })
      setProviderChainId(PUBLIC.chainId)
      setState({ kind: 'idle' })
      return
    } catch { /* fall through to the raw provider (handles add-chain) */ }
    // 2) Raw provider on the CONNECTED connector, with add-chain fallback.
    try {
      const prov: any = (await (connector as any)?.getProvider?.()) ?? (typeof window !== 'undefined' ? (window as any).ethereum : undefined)
      if (!prov?.request) throw new Error('No wallet provider available to switch chains.')
      try {
        await prov.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] })
      } catch (switchErr: any) {
        // 4902 = chain unknown to wallet → add it, then user can switch.
        if (switchErr?.code === 4902) {
          await prov.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetHex,
              chainName: 'Base Sepolia',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            }],
          })
        } else {
          throw switchErr
        }
      }
      setProviderChainId(PUBLIC.chainId)
      setState({ kind: 'idle' })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[UnlockThesis] chain switch failed:', e)
      const { cause, message, detail } = classifyError(e)
      setState({ kind: 'error', cause, message, detail })
    }
  }

  async function handleUnlock() {
    if (!isConnected || !address) return
    if (wrongChain) {
      setState({
        kind: 'error', cause: 'wrong-chain',
        message: `Your wallet is on chainId ${chainId}. Switch to Base Sepolia (84532) and try again.`,
      })
      return
    }
    if (!walletClient) {
      setState({ kind: 'error', cause: 'unknown', message: 'Wallet client not ready. Give it a second and try again.' })
      return
    }
    try {
      // (1) hit the endpoint to get PAYMENT-REQUIRED (price, asset, payTo)
      const first = await fetch(`/api/unlock/${call.id}`, { method: 'POST' })
      if (first.status !== 402) {
        const text = await first.text()
        throw new Error(`expected 402, got ${first.status}: ${text.slice(0, 120)}`)
      }
      const reqHeader = first.headers.get('PAYMENT-REQUIRED') ?? first.headers.get('payment-required')
      if (!reqHeader) throw new Error('missing PAYMENT-REQUIRED header')
      const accepted = JSON.parse(atob(reqHeader)) as {
        amount: string; asset: `0x${string}`; payTo: `0x${string}`
      }

      // (2) The user may be on Ethereum Sepolia (11155111) - a DIFFERENT "Sepolia".
      //     Switch the wallet to Base Sepolia, then send the USDC.transfer through
      //     the connector's provider (this avoids viem's stale-walletClient chain
      //     assertion, which is what threw the "wallet 11155111 != target 84532"
      //     error). x402 "exact" scheme: a plain USDC.transfer(payTo, amount).
      setState({ kind: 'signing' })
      const prov: any = (await (connector as any)?.getProvider?.()) ?? (typeof window !== 'undefined' ? (window as any).ethereum : undefined)
      if (!prov?.request) throw new Error('Wallet provider not available - reconnect and try again.')
      const targetHex = `0x${PUBLIC.chainId.toString(16)}`
      try {
        const cur = await prov.request({ method: 'eth_chainId' })
        if (parseInt(cur, 16) !== PUBLIC.chainId) {
          try { await prov.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] }) }
          catch (e: any) {
            if (e?.code === 4902) {
              await prov.request({ method: 'wallet_addEthereumChain', params: [{
                chainId: targetHex, chainName: 'Base Sepolia',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.base.org'], blockExplorerUrls: ['https://sepolia.basescan.org'],
              }] })
            } else throw e
          }
        }
      } catch {
        throw new Error('Approve the switch to Base Sepolia in your wallet to pay 0.10 USDC.')
      }
      const data = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [accepted.payTo, BigInt(accepted.amount)] })
      const txHash = (await prov.request({ method: 'eth_sendTransaction', params: [{ from: address, to: accepted.asset, data }] })) as `0x${string}`

      // (4) Hand the tx hash to the server. It waits for the receipt, verifies
      //     the transfer matches (to, amount, sender), and returns the thesis.
      setState({ kind: 'settling' })
      const second = await fetch(`/api/unlock/${call.id}`, {
        method: 'POST',
        headers: {
          'PAYMENT-TXHASH': txHash,
          'PAYMENT-FROM': address,
        },
      })
      const json = await second.json()
      if (!second.ok || !json.unlocked) {
        const baseMessage = json.error ?? `unlock failed: ${second.status}`
        const fullMessage = json.detail ? `${baseMessage}: ${json.detail}` : baseMessage
        const err: any = new Error(fullMessage)
        err.serverDetail = json.detail
        err.txHash = txHash
        throw err
      }
      setState({ kind: 'unlocked', data: json.locked, tx: json.unlock?.settlementTxHash ?? txHash })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[UnlockThesis] unlock failed:', e)
      const eth = (typeof window !== 'undefined' ? (window as any).ethereum : null)
      const dump = {
        wagmi: { address, chainId },
        provider: {
          chainIdHex: eth?.chainId ?? null,
          chainIdNum: eth?.chainId ? parseInt(eth.chainId, 16) : null,
          isMetaMask: eth?.isMetaMask ?? false,
        },
        target: { expectedChainId: PUBLIC.chainId },
        txHash: (e as any)?.txHash ?? null,
        error: {
          message: (e as any)?.message ?? String(e),
          code: (e as any)?.code ?? null,
          shortMessage: (e as any)?.shortMessage ?? null,
          serverDetail: (e as any)?.serverDetail ?? null,
        },
      }
      const { cause, message } = classifyError(e)
      let detail: string
      try { detail = JSON.stringify(dump, null, 2) } catch { detail = String(e) }
      setState({ kind: 'error', cause, message, detail })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  // Unlocked: render the thesis content
  if (state.kind === 'unlocked') {
    return <UnlockedView call={call} data={state.data} tx={state.tx} />
  }

  // Hydrating
  if (!mounted || isReconnecting) {
    return <LockedShell call={call} body={<div style={{ color: CF.ink2, fontFamily: CF.mono, fontSize: 12 }}>checking wallet…</div>} />
  }

  // Not connected
  if (!isConnected || !address) {
    return (
      <LockedShell call={call} body={
        <div>
          <p style={{ fontFamily: CF.display, color: CF.ink2, fontSize: 14, lineHeight: 1.6, margin: '0 0 18px' }}>
            Connect your wallet to read the full reasoning, the evidence, why they bet this much, and the case against, for{' '}
            <span style={{ color: CF.ink }}>{call.unlockUsdc.toFixed(2)} USDC</span>.
          </p>
          <ConnectButton variant="primary" />
        </div>
      } />
    )
  }

  // Checking after connect
  if (state.kind === 'checking') {
    return <LockedShell call={call} body={<div style={{ color: CF.ink2, fontFamily: CF.mono, fontSize: 12 }}>checking unlock status…</div>} />
  }

  // Idle / ready / signing / settling / error
  const busy = state.kind === 'signing' || state.kind === 'settling'
  const isError = state.kind === 'error'
  const btnText =
    state.kind === 'signing' ? 'Look at your wallet…' :
    state.kind === 'settling' ? 'Settling on-chain…' :
    isError ? `Try again · ${call.unlockUsdc.toFixed(2)} USDC` :
    `Read the full call · ${call.unlockUsdc.toFixed(2)} USDC`

  return (
    <LockedShell call={call} body={
      <div>
        <p style={{ fontFamily: CF.display, color: CF.ink2, fontSize: 14, lineHeight: 1.6, margin: '0 0 14px' }}>
          The headline is free. Pay{' '}
          <span style={{ color: CF.ink }}>{call.unlockUsdc.toFixed(2)} USDC</span> once to read the full reasoning, the evidence, why they bet this much, and the strongest case against.
        </p>

        {wrongChain ? (
          <div style={{
            padding: '12px 14px', borderRadius: 8, marginBottom: 12,
            background: CF.bearTint,
            border: `1px solid ${CF.bear}`, color: CF.bearInk,
            fontFamily: CF.mono, fontSize: 12, lineHeight: 1.5,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            flexWrap: 'wrap',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>WRONG CHAIN</div>
              {chainLabel(chainId)}. PUNDITS settles on <span style={{ color: CF.ink }}>Base Sepolia (84532)</span>.
            </div>
            <button
              onClick={handleSwitchChain}
              disabled={isSwitchingChain}
              style={{
                padding: '8px 14px', borderRadius: CF.radius.md, border: 'none',
                background: CF.ink, color: CF.bg,
                fontFamily: CF.body, fontSize: 12.5, fontWeight: 600,
                cursor: isSwitchingChain ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isSwitchingChain ? 'Switching…' : 'Switch to Base Sepolia'}
            </button>
          </div>
        ) : null}

        {state.kind === 'signing' ? (
          <div style={{
            padding: '12px 14px', borderRadius: 8, marginBottom: 12,
            background: `color-mix(in oklab, ${CF.amber} 10%, transparent)`,
            border: `1px solid ${CF.amber}`, color: CF.amber,
            fontFamily: CF.mono, fontSize: 12, lineHeight: 1.5,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: CF.amber, animation: 'cf-pulse 1.2s ease-in-out infinite',
            }} />
            <div>
              <div style={{ fontWeight: 700, color: CF.amber }}>CHECK YOUR WALLET</div>
              <div style={{ color: CF.ink2, marginTop: 2 }}>MetaMask should be asking you to approve a {call.unlockUsdc.toFixed(2)} USDC transfer. If you don't see a popup, click your MetaMask extension icon, it may be hidden.</div>
            </div>
          </div>
        ) : null}

        {state.kind === 'settling' ? (
          <div style={{
            padding: '12px 14px', borderRadius: 8, marginBottom: 12,
            background: `color-mix(in oklab, ${CF.bull} 8%, transparent)`,
            border: `1px solid color-mix(in oklab, ${CF.bull} 50%, transparent)`, color: CF.bull,
            fontFamily: CF.mono, fontSize: 12, lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700 }}>SETTLING ON-CHAIN</div>
            <div style={{ color: CF.ink2, marginTop: 2 }}>Confirming your {call.unlockUsdc.toFixed(2)} USDC transfer on Base Sepolia. This usually takes 5–15 seconds.</div>
          </div>
        ) : null}

        <button
          onClick={handleUnlock}
          disabled={busy || wrongChain}
          style={{
            padding: '12px 22px', borderRadius: CF.radius.md, border: 'none',
            background: busy ? CF.ink2 : isError ? CF.amber : CF.ink,
            color: busy ? CF.bg : isError ? CF.ink : CF.bg,
            fontFamily: CF.body, fontSize: 13.5, fontWeight: 600,
            cursor: (busy || wrongChain) ? 'not-allowed' : 'pointer',
          }}
        >
          {btnText}
        </button>

        {isError ? (() => {
          const label =
            state.cause === 'rejected'        ? 'Signature cancelled' :
            state.cause === 'network'         ? 'Network error' :
            state.cause === 'settlement'      ? 'On-chain settlement failed' :
            state.cause === 'wallet-internal' ? 'Wallet internal error' :
            state.cause === 'wrong-chain'     ? 'Chain mismatch' :
                                                'Unlock failed'
          return (
            <div style={{
              marginTop: 12, padding: '12px 14px', borderRadius: 8,
              background: CF.bearTint,
              border: `1px solid ${CF.bear}`, color: CF.bearInk,
              fontFamily: CF.body, fontSize: 13, lineHeight: 1.55,
            }}>
              <div className="mono" style={{
                fontWeight: 700, marginBottom: 6, color: CF.bear,
                textTransform: 'uppercase', letterSpacing: 1, fontSize: 11,
              }}>
                {label}
              </div>
              <div style={{ color: CF.bearInk }}>{state.message}</div>
              {state.detail ? (
                <details style={{ marginTop: 8 }}>
                  <summary style={{
                    cursor: 'pointer', color: CF.bear,
                    fontFamily: CF.mono, fontSize: 11, letterSpacing: 0.4,
                  }}>
                    show full error
                  </summary>
                  <div className="mono" style={{
                    marginTop: 6, padding: '8px 10px', borderRadius: 6,
                    background: CF.surface, color: CF.ink2,
                    border: `1px solid ${CF.line}`,
                    fontSize: 11, lineHeight: 1.5,
                    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                  }}>
                    {state.detail}
                  </div>
                </details>
              ) : null}
            </div>
          )
        })() : null}

        {/* keyframes for the pulsing dot */}
        <style>{`
          @keyframes cf-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.35; transform: scale(0.78); }
          }
        `}</style>
      </div>
    } />
  )
}

// ── locked shell shown until the user unlocks ─────────────────────────────
function LockedShell({ call, body }: { call: PublishedCall; body: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: CF.surface,
      border: `1px solid ${CF.line}`,
      borderRadius: 12,
      padding: '22px 22px',
      overflow: 'hidden',
    }}>
      <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.amber, letterSpacing: 1.8, marginBottom: 12 }}>
        🔒 LOCKED
      </div>
      {body}
      <div style={{
        marginTop: 22, paddingTop: 14, borderTop: `1px dashed ${CF.line}`,
        fontFamily: CF.mono, fontSize: 11, color: CF.ink4,
      }}>
        Pay once per wallet to read it.
      </div>
    </div>
  )
}

// ── unlocked thesis view ─────────────────────────────────────────────────
function UnlockedView({ call, data, tx }: { call: PublishedCall; data: Unlocked; tx?: string }) {
  return (
    <div style={{
      background: CF.surface, border: `1px solid color-mix(in oklab, ${CF.bull} 30%, ${CF.line})`, borderRadius: 12,
      padding: '22px 24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.bull, letterSpacing: 1.8 }}>
          ✓ UNLOCKED
        </div>
        {tx ? (
          <a href={`https://sepolia.basescan.org/tx/${tx}`} target="_blank" rel="noreferrer" style={{
            fontFamily: CF.mono, fontSize: 11, color: CF.ink2, textDecoration: 'none',
          }}>
            settlement {tx.slice(0, 10)}… ↗
          </a>
        ) : null}
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.ink2, letterSpacing: 1.5, marginBottom: 8 }}>
          THE FULL CALL
        </div>
        <p style={{ fontFamily: CF.display, fontSize: 14.5, color: CF.ink, lineHeight: 1.65, margin: 0 }}>
          {data.thesis}
        </p>
      </div>

      {data.evidenceUrls && data.evidenceUrls.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.ink2, letterSpacing: 1.5, marginBottom: 8 }}>
EVIDENCE · {data.evidenceUrls.length} sources the agents paid for
          </div>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
            {data.evidenceUrls.map((e, i) => (
              <li key={i} style={{
                padding: '8px 0', display: 'flex', justifyContent: 'space-between',
                borderBottom: i < data.evidenceUrls.length - 1 ? `1px dashed ${CF.line}` : 'none',
                fontFamily: CF.mono, fontSize: 12,
              }}>
                <a href={e.url} target="_blank" rel="noreferrer" style={{ color: CF.bull, textDecoration: 'none', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12 }}>
                  {e.label || e.url}
                </a>
                <span style={{
                  color: e.signal === 'YES' ? CF.bull : e.signal === 'NO' ? CF.bear : CF.amber,
                  fontWeight: 600,
                }}>
                  {e.signal}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.ink2, letterSpacing: 1.5, marginBottom: 8 }}>
THE CASE AGAINST · FROM THE SKEPTIC
        </div>
        <p style={{ fontFamily: CF.display, fontSize: 13.5, color: CF.ink2, lineHeight: 1.6, margin: 0 }}>
          {data.counterarguments}
        </p>
      </div>

      <div>
        <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.ink2, letterSpacing: 1.5, marginBottom: 8 }}>
WHY THEY BET THIS MUCH
        </div>
        <p style={{ fontFamily: CF.display, fontSize: 13, color: CF.ink2, lineHeight: 1.6, margin: 0 }}>
          {data.sizingRationale}
        </p>
      </div>
    </div>
  )
}
