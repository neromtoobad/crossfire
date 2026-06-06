'use client'

// Phase 8.5 — user-side x402 unlock flow.
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
import { useAccount, useChainId, useSignTypedData, useSwitchChain } from 'wagmi'
import { parseUnits } from 'viem'
import {
  createOpenDelegation,
  ScopeType,
  getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'
import {
  createCaveatBuilder,
  encodeDelegations,
  generateSalt,
  SIGNABLE_DELEGATION_TYPED_DATA,
  toDelegationStruct,
} from '@metamask/smart-accounts-kit/utils'
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
// the request — most often a chain mismatch or a locked wallet.
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
        'Your wallet returned an internal error. Most common causes: (1) wallet is on the wrong chain — switch to Base Sepolia (84532); (2) wallet is locked — unlock it and retry; (3) MetaMask needs a refresh — try closing and reopening the extension.',
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

  const { address, status: accountStatus } = useAccount()
  const chainId = useChainId() // returns the wallet's raw chainId number — even for chains we haven't registered in wagmi config
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()
  const { signTypedDataAsync } = useSignTypedData()
  const isConnected = accountStatus === 'connected'
  const isReconnecting = accountStatus === 'reconnecting' || accountStatus === 'connecting'
  // Now correctly catches Ethereum mainnet / Polygon / any non-Base chain.
  const wrongChain = isConnected && chainId !== PUBLIC.chainId

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

  async function handleSwitchChain() {
    try {
      await switchChainAsync({ chainId: PUBLIC.chainId })
      // After switch, wipe any prior error and let the user click Unlock again.
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
    setState({ kind: 'signing' })
    try {
      // (1) hit the endpoint to get PAYMENT-REQUIRED
      const first = await fetch(`/api/unlock/${call.id}`, { method: 'POST' })
      if (first.status !== 402) {
        const text = await first.text()
        throw new Error(`expected 402, got ${first.status}: ${text.slice(0, 120)}`)
      }
      const reqHeader = first.headers.get('PAYMENT-REQUIRED') ?? first.headers.get('payment-required')
      if (!reqHeader) throw new Error('missing PAYMENT-REQUIRED header')
      const accepted = JSON.parse(atob(reqHeader)) as any
      const env = getSmartAccountsEnvironment(PUBLIC.chainId)

      // (2) build the user's open delegation: pay up to `accepted.amount` USDC,
      //     restricted to the facilitator listed in accepted.extra.facilitators.
      const caveats = createCaveatBuilder(env)
        .addCaveat('redeemer', { redeemers: accepted.extra.facilitators })
        .build()

      const delegation = createOpenDelegation({
        from: address,
        scope: {
          type: ScopeType.Erc20TransferAmount,
          tokenAddress: accepted.asset as `0x${string}`,
          maxAmount: BigInt(accepted.amount),
        },
        caveats,
        salt: generateSalt(),
        environment: env,
      })

      // (3) sign typed data via wagmi (the kit-in-main-flow moment)
      const struct = toDelegationStruct(delegation)
      const signature = await signTypedDataAsync({
        account: address,
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: PUBLIC.chainId,
          verifyingContract: env.DelegationManager as `0x${string}`,
        },
        types: SIGNABLE_DELEGATION_TYPED_DATA,
        primaryType: 'Delegation',
        message: {
          delegate: struct.delegate as `0x${string}`,
          delegator: struct.delegator as `0x${string}`,
          authority: struct.authority as `0x${string}`,
          caveats: struct.caveats.map((c: any) => ({
            enforcer: c.enforcer as `0x${string}`,
            terms: c.terms as `0x${string}`,
          })),
          salt: BigInt(struct.salt),
        },
      })

      const signedDelegation = { ...delegation, signature }
      const permissionContext = encodeDelegations([signedDelegation as any])

      setState({ kind: 'settling' })

      // (4) retry with PAYMENT-SIGNATURE; server settles + returns thesis
      const paymentPayload = {
        x402Version: 2,
        accepted,
        payload: {
          delegationManager: env.DelegationManager,
          permissionContext,
          delegator: address,
        },
      }
      const paymentHeader = btoa(JSON.stringify(paymentPayload))
      const second = await fetch(`/api/unlock/${call.id}`, {
        method: 'POST',
        headers: { 'PAYMENT-SIGNATURE': paymentHeader },
      })
      const json = await second.json()
      if (!second.ok || !json.unlocked) {
        throw new Error(json.error ?? `unlock failed: ${second.status}`)
      }
      setState({ kind: 'unlocked', data: json.locked, tx: json.unlock?.settlementTxHash })
    } catch (e) {
      // Log the raw error to the console so we (and the user) can read the
      // full structure. The classified version is what the UI surfaces.
      // eslint-disable-next-line no-console
      console.error('[UnlockThesis] sign/settle failed:', e)
      const { cause, message, detail } = classifyError(e)
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
            Connect your wallet to unlock the full thesis, evidence trail, sizing logic, and counterarguments for{' '}
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
    `Unlock thesis · ${call.unlockUsdc.toFixed(2)} USDC`

  return (
    <LockedShell call={call} body={
      <div>
        <p style={{ fontFamily: CF.display, color: CF.ink2, fontSize: 14, lineHeight: 1.6, margin: '0 0 14px' }}>
          The headline is free. Sign a one-shot <span style={{ color: CF.ink }}>x402 micropayment</span> for{' '}
          <span style={{ color: CF.ink }}>{call.unlockUsdc.toFixed(2)} USDC</span> to unlock the full thesis, evidence URLs, sizing logic, and the Skeptic's counterarguments.
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
              Your wallet is on <span style={{ color: CF.ink }}>chainId {chainId}</span>.
              CROSSFIRE settles on <span style={{ color: CF.ink }}>Base Sepolia (84532)</span>.
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
              <div style={{ color: CF.ink2, marginTop: 2 }}>MetaMask should be asking you to sign a typed-data delegation. If you don't see a popup, click your MetaMask extension icon — it may be hidden.</div>
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
            <div style={{ color: CF.ink2, marginTop: 2 }}>The facilitator is redeeming your signed delegation and moving {call.unlockUsdc.toFixed(2)} USDC. This usually takes 5–15 seconds.</div>
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
        🔒 LOCKED THESIS
      </div>
      {body}
      <div style={{
        marginTop: 22, paddingTop: 14, borderTop: `1px dashed ${CF.line}`,
        fontFamily: CF.mono, fontSize: 11, color: CF.ink4,
      }}>
        Unlock once per wallet · refund-on-resolve not implemented (Phase 8.6)
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
          ✓ UNLOCKED THESIS
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
          THESIS
        </div>
        <p style={{ fontFamily: CF.display, fontSize: 14.5, color: CF.ink, lineHeight: 1.65, margin: 0 }}>
          {data.thesis}
        </p>
      </div>

      {data.evidenceUrls && data.evidenceUrls.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.ink2, letterSpacing: 1.5, marginBottom: 8 }}>
            EVIDENCE TRAIL ({data.evidenceUrls.length} sources, all paid via x402)
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
          COUNTERARGUMENTS (THE SKEPTIC'S CASE AGAINST)
        </div>
        <p style={{ fontFamily: CF.display, fontSize: 13.5, color: CF.ink2, lineHeight: 1.6, margin: 0 }}>
          {data.counterarguments}
        </p>
      </div>

      <div>
        <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.ink2, letterSpacing: 1.5, marginBottom: 8 }}>
          SIZING RATIONALE
        </div>
        <p style={{ fontFamily: CF.display, fontSize: 13, color: CF.ink2, lineHeight: 1.6, margin: 0 }}>
          {data.sizingRationale}
        </p>
      </div>
    </div>
  )
}
