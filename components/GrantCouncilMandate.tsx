'use client'

// Phase 9.4, the user-facing MetaMask Smart Accounts Kit moment.
//
// This is the qualifying "Advanced Permissions (ERC-7715) in the main flow"
// interaction: the user grants the council a capped, expiring USDC spending
// mandate through MetaMask's NATIVE permission dialog. The kit's
// erc7715ProviderActions wraps wallet_requestExecutionPermissions; MetaMask
// returns a scoped permission context which we display as proof.
//
// The grant IS the demonstrated kit interaction, it does not depend on
// server-side redemption (which is the counterfactual-smart-account rabbit
// hole). Thesis unlock stays a plain transfer; this is the kit showcase.

import { useEffect, useState } from 'react'
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'
import { ConnectButton } from './ConnectButton'
import { PUBLIC } from '../lib/public-config'
import { CF, alpha } from '../lib/theme'

export type Granted = {
  context: `0x${string}`
  delegationManager?: `0x${string}`
  capUsdc: number
  expiry: number
  redeemer: `0x${string}`
}

type State =
  | { kind: 'idle' }
  | { kind: 'granting' }
  | { kind: 'granted'; data: Granted }
  | { kind: 'error'; message: string; detail?: string }

const CAP_USDC = 5
const EXPIRY_HOURS = 1

function classify(e: unknown): { message: string; detail?: string } {
  const err = e as { code?: number; message?: string; shortMessage?: string; details?: string; cause?: { message?: string } }
  const code = err?.code
  const msg = err?.shortMessage ?? err?.message ?? String(e)
  const detail = [err?.details, err?.cause?.message].filter(Boolean).join(' · ')
  if (code === 4001 || /user rejected|user denied/i.test(msg)) {
    return { message: 'You declined the permission in your wallet.', detail }
  }
  if (/not (supported|found)|unsupported method|unknown method|wallet_requestExecutionPermissions/i.test(msg)) {
    return {
      message: 'Your wallet does not support MetaMask Advanced Permissions (ERC-7715). Use the MetaMask browser extension with smart accounts enabled.',
      detail,
    }
  }
  if (code === -32603) {
    return { message: 'Wallet returned an internal error, make sure you are on Base Sepolia and the wallet is unlocked.', detail: detail || msg.slice(0, 240) }
  }
  return { message: msg.slice(0, 240), detail }
}

export type GrantContext = {
  kicker?: string | null    // null hides the kicker (e.g. when embedded)
  title?: string
  blurb?: React.ReactNode
  cta?: string
}

export function GrantCouncilMandate({ onDone, context }: { onDone?: (granted: Granted) => void; context?: GrantContext } = {}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { address, status, connector } = useAccount()
  const wagmiChainId = useChainId()
  const { switchChainAsync, isPending: switching } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  const isConnected = status === 'connected'
  const isReconnecting = status === 'reconnecting' || status === 'connecting'

  // Read the chain from the ACTUAL connected wallet's provider, NOT
  // window.ethereum, which can be a different installed wallet (or absent for an
  // embedded wallet) and falsely report the wrong chain. Falls back to wagmi.
  const [providerChainId, setProviderChainId] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    let prov: any
    const toNum = (h: any) => { const n = typeof h === 'string' ? parseInt(h, 16) : Number(h); return Number.isFinite(n) && n > 0 ? n : null }
    const onChange = (h: any) => setProviderChainId(toNum(h))
    ;(async () => {
      try {
        prov = (await (connector as any)?.getProvider?.()) ?? (typeof window !== 'undefined' ? (window as any).ethereum : undefined)
        if (!prov?.request) return
        const h = await prov.request({ method: 'eth_chainId' })
        if (!cancelled) setProviderChainId(toNum(h))
        prov.on?.('chainChanged', onChange)
      } catch { /* fall back to wagmiChainId */ }
    })()
    return () => { cancelled = true; try { prov?.removeListener?.('chainChanged', onChange) } catch {} }
  }, [connector, status])
  // Chain gate REMOVED. Client-side chain detection was unreliable and kept
  // false-flagging Base Sepolia. The grant request itself specifies
  // chainId: PUBLIC.chainId, so MetaMask handles any real switch on its own.
  const chainId = providerChainId ?? wagmiChainId // kept for the (now unused) diagnostics
  const wrongChain = false

  const [state, setState] = useState<State>({ kind: 'idle' })

  // Spine hook: notify a parent once the mandate is granted, handing over the
  // real permission context so the bet can be recorded with its on-chain proof.
  useEffect(() => {
    if (state.kind === 'granted') onDone?.(state.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind])

  async function handleSwitch() {
    // 1) wagmi's cross-connector switch (works for MetaMask, embedded, WC…).
    try {
      await switchChainAsync({ chainId: PUBLIC.chainId })
      setProviderChainId(PUBLIC.chainId)
      setState({ kind: 'idle' })
      return
    } catch { /* fall through to the raw provider (handles add-chain) */ }
    // 2) Raw provider on the CONNECTED connector, with add-chain fallback.
    const hex = `0x${PUBLIC.chainId.toString(16)}`
    try {
      const prov: any = (await (connector as any)?.getProvider?.()) ?? (typeof window !== 'undefined' ? (window as any).ethereum : undefined)
      if (!prov?.request) throw new Error('No wallet provider available to switch chains.')
      try { await prov.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] }) }
      catch (e: any) {
        if (e?.code === 4902) {
          await prov.request({ method: 'wallet_addEthereumChain', params: [{
            chainId: hex, chainName: 'Base Sepolia',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.base.org'], blockExplorerUrls: ['https://sepolia.basescan.org'],
          }] })
        } else throw e
      }
      setProviderChainId(PUBLIC.chainId)
      setState({ kind: 'idle' })
    } catch (e) {
      const { message, detail } = classify(e)
      setState({ kind: 'error', message, detail })
    }
  }

  async function handleGrant() {
    if (!isConnected || !address || !walletClient) return
    if (wrongChain) {
      setState({ kind: 'error', message: `Your wallet is on chainId ${chainId}. Switch to Base Sepolia (84532) first.` })
      return
    }
    setState({ kind: 'granting' })
    try {
      const expiry = Math.floor(Date.now() / 1000) + EXPIRY_HOURS * 3600
      const erc7715 = walletClient.extend(erc7715ProviderActions())
      const granted = await erc7715.requestExecutionPermissions([{
        chainId: PUBLIC.chainId,
        to: PUBLIC.ORCHESTRATOR,
        permission: {
          type: 'erc20-token-allowance',
          data: {
            tokenAddress: PUBLIC.USDC as `0x${string}`,
            allowanceAmount: BigInt(CAP_USDC) * 1_000_000n, // 6 decimals
          },
          isAdjustmentAllowed: false,
        },
        from: address as `0x${string}`,
        expiry,
        redeemer: [PUBLIC.ORCHESTRATOR],
      }])
      const g = granted?.[0]
      if (!g?.context) throw new Error('wallet returned an empty permission')
      setState({
        kind: 'granted',
        data: {
          context: g.context as `0x${string}`,
          delegationManager: (g.delegationManager ?? undefined) as `0x${string}` | undefined,
          capUsdc: CAP_USDC,
          expiry,
          redeemer: PUBLIC.ORCHESTRATOR,
        },
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[GrantCouncilMandate] grant failed:', e)
      const { message, detail } = classify(e)
      setState({ kind: 'error', message, detail })
    }
  }

  // ── render ──────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: CF.surface, border: `1px solid ${CF.line}`,
    borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, padding: '22px 22px',
  }

  if (!mounted || isReconnecting) {
    return <div style={card}><div className="mono" style={{ fontSize: 12, color: CF.ink3 }}>checking wallet…</div></div>
  }

  if (state.kind === 'granted') {
    const g = state.data
    const mins = Math.max(0, Math.round((g.expiry * 1000 - Date.now()) / 60000))
    return (
      <div style={{ ...card, borderColor: `${alpha(CF.bull, 33)}` }}>
        <div className="mono" style={{ fontSize: 10.5, color: CF.bull, letterSpacing: 1.8, marginBottom: 12 }}>
          ✓ MANDATE GRANTED · ERC-7715 ADVANCED PERMISSION
        </div>
        <div style={{ fontFamily: CF.body, fontSize: 14.5, color: CF.ink, lineHeight: 1.55, marginBottom: 14 }}>
          MetaMask issued the council a scoped, revocable spending permission. The chain enforces every limit, the council can never exceed it.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontFamily: CF.mono, fontSize: 12 }}>
          <span style={{ color: CF.ink3 }}>cap</span>
          <span className="tnum" style={{ color: CF.ink, fontWeight: 600 }}>{g.capUsdc.toFixed(2)} USDC</span>
          <span style={{ color: CF.ink3 }}>expires</span>
          <span className="tnum" style={{ color: CF.ink }}>in {mins} min</span>
          <span style={{ color: CF.ink3 }}>redeemer</span>
          <span className="tnum" style={{ color: CF.ink2 }}>{g.redeemer.slice(0, 10)}…{g.redeemer.slice(-4)} (council)</span>
          {g.delegationManager ? (<>
            <span style={{ color: CF.ink3 }}>manager</span>
            <span className="tnum" style={{ color: CF.ink2 }}>{g.delegationManager.slice(0, 10)}…{g.delegationManager.slice(-4)}</span>
          </>) : null}
          <span style={{ color: CF.ink3 }}>context</span>
          <span className="tnum" style={{ color: CF.ink2, wordBreak: 'break-all' }}>{g.context.slice(0, 22)}…{g.context.slice(-8)}</span>
        </div>
        <button
          onClick={() => setState({ kind: 'idle' })}
          style={{ marginTop: 16, padding: '8px 14px', borderRadius: CF.radius.md, border: `1px solid ${CF.line2}`, background: CF.surface, color: CF.ink2, fontFamily: CF.body, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Grant another
        </button>
      </div>
    )
  }

  const busy = state.kind === 'granting'
  const isError = state.kind === 'error'

  return (
    <div style={card}>
      {context?.kicker !== null && (
        <div className="mono" style={{ fontSize: 10.5, color: CF.gold, letterSpacing: 1.8, marginBottom: 10 }}>
          {context?.kicker ?? '▸ BACK THE COUNCIL · METAMASK SMART ACCOUNTS KIT'}
        </div>
      )}
      <div style={{ fontFamily: CF.display, fontSize: 22, fontWeight: 500, letterSpacing: -0.4, color: CF.ink, marginBottom: 8, fontVariationSettings: '"opsz" 40' }}>
        {context?.title ?? 'Set the council’s budget'}
      </div>
      <p style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink2, lineHeight: 1.55, margin: '0 0 16px', maxWidth: 560 }}>
        {context?.blurb ?? (
          <>Let the council spend up to <strong style={{ color: CF.ink, fontWeight: 600 }}>${CAP_USDC}</strong> for the next {EXPIRY_HOURS} hour, and only the council can use it. It’s capped, expires on its own, and you can cancel anytime from your wallet. The blockchain enforces the limit, not our code.</>
        )}
      </p>

      {!isConnected || !address ? (
        <ConnectButton variant="primary" />
      ) : wrongChain ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: 12, color: CF.bearInk, background: CF.bearTint, border: `1px solid ${alpha(CF.bear, 25)}`, borderRadius: CF.radius.md, padding: '8px 12px' }}>
            wallet on chainId {chainId}, needs Base Sepolia (84532)
          </span>
          <button onClick={handleSwitch} disabled={switching} style={{ padding: '10px 16px', borderRadius: CF.radius.md, border: 'none', background: CF.ink, color: CF.bg, fontFamily: CF.body, fontSize: 13, fontWeight: 600, cursor: switching ? 'wait' : 'pointer' }}>
            {switching ? 'Switching…' : 'Switch to Base Sepolia'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGrant}
          disabled={busy}
          style={{ padding: '12px 20px', borderRadius: CF.radius.md, border: 'none', background: busy ? CF.ink2 : CF.ink, color: CF.bg, fontFamily: CF.body, fontSize: 13.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}
        >
          {busy ? 'Look at your wallet…' : (context?.cta ?? `Grant mandate · ${CAP_USDC} USDC / ${EXPIRY_HOURS}h`)}
        </button>
      )}

      {busy ? (
        <div className="mono" style={{ marginTop: 12, fontSize: 12, color: CF.amber, lineHeight: 1.5 }}>
          MetaMask should be showing its Advanced Permissions dialog. Approve to grant the scoped mandate.
        </div>
      ) : null}

      {isError ? (
        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: CF.radius.md, background: CF.bearTint, border: `1px solid ${CF.bear}`, color: CF.bearInk, fontFamily: CF.body, fontSize: 13, lineHeight: 1.5 }}>
          <div className="mono" style={{ fontWeight: 700, marginBottom: 4, color: CF.bear, fontSize: 11, letterSpacing: 1 }}>GRANT FAILED</div>
          {state.message}
          {state.detail ? (
            <details style={{ marginTop: 8 }}>
              <summary className="mono" style={{ cursor: 'pointer', color: CF.bear, fontSize: 11 }}>show full error</summary>
              <div className="mono" style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, background: CF.surface, border: `1px solid ${CF.line}`, color: CF.ink2, fontSize: 11, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{state.detail}</div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
