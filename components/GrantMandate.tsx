'use client'

// Phase 7.4 — the kit-in-main-flow moment.
//
// The user picks a cap, picks an expiry, clicks Grant. We build an
// ERC-7710 delegation via the MetaMask Smart Accounts Kit, ask the
// connected wallet to sign the typed-data payload, and POST the result
// to /api/mandate. The MetaMask popup is the integration the judges
// need to see in the demo video.

import { useEffect, useState } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import { parseUnits } from 'viem'
import {
  createDelegation,
  ScopeType,
  getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'
import {
  createCaveatBuilder,
  generateSalt,
  SIGNABLE_DELEGATION_TYPED_DATA,
  toDelegationStruct,
} from '@metamask/smart-accounts-kit/utils'
import { ConnectButton } from './ConnectButton'
import { PUBLIC, MANDATE_LIMITS } from '../lib/public-config'

const CF = {
  bg: '#060608', panel: '#0c0c11', panelHi: '#101017',
  edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

type Props = {
  marketId: string
  marketAddress: `0x${string}`
  marketTitle: string
}

export function GrantMandate({ marketId, marketAddress, marketTitle }: Props) {
  // wagmi state hydrates AFTER first render in Next.js SSR — without these
  // flags we briefly show "Connect wallet" even for users with a session in
  // localStorage, because the server has no idea about their wallet.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { address, status: accountStatus, chain } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const isConnected = accountStatus === 'connected'
  const isReconnecting = accountStatus === 'reconnecting' || accountStatus === 'connecting'

  // ── debug panel — shown in every state until we confirm wagmi works ──
  const debugBox = (
    <div style={{
      padding: '10px 14px', marginBottom: 12, borderRadius: 8,
      background: '#0a0a14', border: `1px dashed ${CF.edgeHi}`,
      fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, lineHeight: 1.7,
    }}>
      <div style={{ color: CF.dim, marginBottom: 4, letterSpacing: 1.5 }}>WAGMI DEBUG</div>
      mounted: <span style={{ color: mounted ? CF.bull : CF.bear }}>{String(mounted)}</span>
      {' · '}status: <span style={{ color: isConnected ? CF.bull : CF.bear }}>{accountStatus}</span>
      {' · '}address: <span style={{ color: address ? CF.bull : CF.bear }}>{address ?? 'none'}</span>
      {' · '}chainId: <span style={{ color: chain?.id === PUBLIC.chainId ? CF.bull : CF.amber }}>{chain?.id ?? 'none'}</span>
    </div>
  )

  const [capUsdc, setCapUsdc] = useState<number>(MANDATE_LIMITS.defaultCapUsdc)
  const [hours, setHours] = useState<number>(MANDATE_LIMITS.defaultExpiryHours)
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'signing' }
    | { kind: 'storing' }
    | { kind: 'granted'; txId: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  // Don't fire "wrong chain" while wagmi is still resolving chain — only when
  // it's definitely known to be something other than Base Sepolia.
  const wrongChain = isConnected && chain !== undefined && chain.id !== PUBLIC.chainId

  async function handleGrant() {
    if (!isConnected || !address) {
      setStatus({ kind: 'error', message: `Connect your wallet first. (status: ${accountStatus})` })
      return
    }
    if (wrongChain) {
      setStatus({ kind: 'error', message: `Switch to Base Sepolia (chainId ${PUBLIC.chainId}) in your wallet.` })
      return
    }

    try {
      setStatus({ kind: 'signing' })

      const env = getSmartAccountsEnvironment(PUBLIC.chainId)
      const capWei = parseUnits(String(capUsdc), 6)

      // Caveat: allowed targets = [USDC, market]. The agents can ONLY call
      // these two contracts. The Erc20TransferAmount scope additionally caps
      // total USDC spend at capWei.
      const caveats = createCaveatBuilder(env)
        .addCaveat('allowedTargets', { targets: [PUBLIC.USDC, marketAddress] })
        .build()

      const delegation = createDelegation({
        from: address,
        to: PUBLIC.ORCHESTRATOR, // the service that redelegates to Bull/Bear
        scope: {
          type: ScopeType.Erc20TransferAmount,
          tokenAddress: PUBLIC.USDC,
          maxAmount: capWei,
        },
        caveats,
        salt: generateSalt(),
        environment: env,
      })

      // ── This is the MetaMask popup moment ──
      // We bypass the kit's signDelegationAction (which needs a pre-
      // instantiated walletClient that wagmi may not have ready yet) and
      // call wagmi's useSignTypedData hook directly. The typed-data
      // structure is the kit's spec, hashed identically to what the
      // DelegationManager expects.
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

      setStatus({ kind: 'storing' })

      const expiresAt = Date.now() + hours * 60 * 60 * 1000
      const res = await fetch('/api/mandate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user: address,
          marketId,
          capUsdc,
          capWei: capWei.toString(),
          expiresAt,
          signedDelegation,
          delegationManager: env.DelegationManager,
          chainId: PUBLIC.chainId,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'server rejected mandate')

      setStatus({ kind: 'granted', txId: signature.slice(0, 14) })
    } catch (e) {
      const msg = (e as Error).message || 'unknown error'
      setStatus({ kind: 'error', message: msg.slice(0, 200) })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (status.kind === 'granted') {
    return (
      <div style={panelStyle()}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.bull, marginBottom: 14 }}>
          MANDATE ACTIVE
        </div>
        <div style={{ fontFamily: CF.display, fontSize: 22, fontWeight: 600, color: CF.text, marginBottom: 12 }}>
          {capUsdc} USDC · {hours}h · {marketTitle.slice(0, 60)}
        </div>
        <div style={{ fontFamily: CF.mono, fontSize: 12, color: CF.dim, marginBottom: 22, lineHeight: 1.6 }}>
          You signed a delegation to <span style={{ color: CF.text }}>{PUBLIC.ORCHESTRATOR.slice(0, 8)}…</span>.
          The chain will refuse anything beyond {capUsdc} USDC. Hit "Run duel" when you're ready.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href={`/duel/${marketId}`} style={ctaPrimary()}>
            Run the duel →
          </a>
          <a href="/" style={ctaSecondary()}>Back to dashboard</a>
        </div>
      </div>
    )
  }

  // ── Hydrating / reconnecting ─────────────────────────────────────────
  if (!mounted || isReconnecting) {
    return (
      <div style={panelStyle()}>
        {debugBox}
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.dim, marginBottom: 14 }}>
          CHECKING WALLET…
        </div>
        <p style={{ fontFamily: CF.display, color: CF.dim, lineHeight: 1.6, fontSize: 14, margin: 0 }}>
          One moment — restoring your wallet session.
        </p>
      </div>
    )
  }

  // ── Not connected gate ────────────────────────────────────────────────
  if (!isConnected || !address) {
    return (
      <div style={panelStyle()}>
        {debugBox}
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.dim, marginBottom: 14 }}>
          STEP 1 — CONNECT WALLET
        </div>
        <p style={{ fontFamily: CF.display, color: CF.dim, lineHeight: 1.6, fontSize: 14, margin: '0 0 22px' }}>
          Connect a wallet to grant the agents a capped budget. Your private key never leaves your wallet.
        </p>
        <ConnectButton variant="primary" />
      </div>
    )
  }

  return (
    <div style={panelStyle()}>
      {debugBox}
      <div style={{ fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.bull, marginBottom: 14 }}>
        STEP 2 — GRANT MANDATE
      </div>

      {/* CAP */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim }}>max spend on this market</span>
          <span style={{ fontFamily: CF.mono, fontSize: 20, color: CF.text, fontWeight: 600 }}>
            {capUsdc} <span style={{ color: CF.dim, fontSize: 14 }}>USDC</span>
          </span>
        </div>
        <input
          type="range"
          min={MANDATE_LIMITS.minCapUsdc}
          max={MANDATE_LIMITS.maxCapUsdc}
          step={1}
          value={capUsdc}
          onChange={(e) => setCapUsdc(Number(e.target.value))}
          style={{ width: '100%', accentColor: CF.bull }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: CF.mono, fontSize: 10, color: CF.dimmer, marginTop: 4 }}>
          <span>$1</span><span>$50</span>
        </div>
      </div>

      {/* EXPIRY */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.dim, marginBottom: 10 }}>mandate expires after</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MANDATE_LIMITS.expiryChoices.map((c) => (
            <button
              key={c.hours}
              onClick={() => setHours(c.hours)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: hours === c.hours ? `color-mix(in oklab, ${CF.bull} 12%, transparent)` : 'transparent',
                border: `1px solid ${hours === c.hours ? CF.bull : CF.edge}`,
                color: hours === c.hours ? CF.text : CF.dim,
                fontFamily: CF.display, fontSize: 13, fontWeight: 500,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY */}
      <div style={{
        padding: '12px 14px', background: CF.bg, border: `1px solid ${CF.edge}`,
        borderRadius: 8, marginBottom: 18, fontFamily: CF.mono, fontSize: 11.5, color: CF.dim, lineHeight: 1.7,
      }}>
        <div>you sign <span style={{ color: CF.text }}>once</span> for {capUsdc} USDC over {hours}h</div>
        <div>agents may only call <span style={{ color: CF.bull }}>USDC</span> and this market — nothing else</div>
        <div>over-cap attempts are <span style={{ color: CF.bear }}>refused by the chain</span></div>
        <div>revoke anytime to halt all further spend</div>
      </div>

      {wrongChain ? (
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 14,
          border: `1px solid ${CF.bear}`, background: `color-mix(in oklab, ${CF.bear} 12%, transparent)`,
          color: CF.bear, fontFamily: CF.mono, fontSize: 11.5,
        }}>
          your wallet is on a different chain — switch to Base Sepolia (chainId 84532) to continue
        </div>
      ) : null}

      <button
        onClick={handleGrant}
        disabled={status.kind !== 'idle' || wrongChain}
        style={{
          width: '100%',
          padding: '14px 22px',
          borderRadius: 9,
          background: status.kind === 'signing' || status.kind === 'storing' ? CF.dim : CF.text,
          color: '#000',
          fontFamily: CF.display, fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
          border: 'none',
          cursor: status.kind === 'idle' && !wrongChain ? 'pointer' : 'not-allowed',
          boxShadow: status.kind === 'idle' && !wrongChain
            ? `0 0 30px color-mix(in oklab, ${CF.bull} 18%, transparent)`
            : 'none',
        }}
      >
        {status.kind === 'signing'
          ? 'Waiting for wallet signature…'
          : status.kind === 'storing'
            ? 'Storing mandate…'
            : `Sign and grant ${capUsdc} USDC mandate`}
      </button>

      {status.kind === 'error' ? (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 8,
          border: `1px solid ${CF.bear}`, background: `color-mix(in oklab, ${CF.bear} 10%, transparent)`,
          color: CF.bear, fontFamily: CF.mono, fontSize: 11.5, wordBreak: 'break-word',
        }}>
          {status.message}
        </div>
      ) : null}
    </div>
  )
}

// ── small helpers ────────────────────────────────────────────────────────
function panelStyle(): React.CSSProperties {
  return {
    background: CF.panel,
    border: `1px solid ${CF.edge}`,
    borderRadius: 12,
    padding: '24px 22px',
  }
}
function ctaPrimary(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '12px 20px', borderRadius: 9, textDecoration: 'none',
    background: CF.text, color: '#000',
    fontFamily: CF.display, fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
  }
}
function ctaSecondary(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '12px 20px', borderRadius: 9, textDecoration: 'none',
    border: `1px solid ${CF.edge}`, color: CF.dim,
    fontFamily: CF.display, fontSize: 14, fontWeight: 500,
  }
}
