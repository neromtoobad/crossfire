'use client'

// Embedded-wallet connect button (MetaMask Embedded Wallets / Web3Auth v10).
// "Sign in or connect" opens the Web3Auth modal — email, Google, social, OR
// MetaMask — and yields an embedded smart account. Same look + variant API as
// the RainbowKit ConnectButton, so it's a drop-in when the feature is enabled.

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { useWeb3Auth, useWeb3AuthConnect, useWeb3AuthDisconnect } from '@web3auth/modal/react'
import { CF, alpha } from '../lib/theme'

export function Web3AuthConnect({ variant = 'primary' }: { variant?: 'primary' | 'ghost' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { isConnected, isInitialized } = useWeb3Auth()
  const { connect, loading } = useWeb3AuthConnect()
  const { disconnect } = useWeb3AuthDisconnect()
  const { address, chain } = useAccount()

  const baseStyle: React.CSSProperties =
    variant === 'primary'
      ? { padding: '10px 16px', borderRadius: CF.radius.md, background: CF.ink, color: CF.bg, fontFamily: CF.body, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }
      : { padding: '8px 12px', borderRadius: CF.radius.md, background: 'transparent', color: CF.ink2, fontFamily: CF.body, fontSize: 13, fontWeight: 500, border: `1px solid ${CF.line}`, cursor: 'pointer' }

  // placeholder during SSR / SDK init — keeps the layout from jumping
  if (!mounted || !isInitialized) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: CF.radius.md, background: CF.surface, color: CF.ink3, fontFamily: CF.body, fontSize: 13, fontWeight: 500, border: `1px solid ${CF.line}` }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: CF.ink4, opacity: 0.6 }} />
        {mounted ? 'loading…' : ''}
      </span>
    )
  }

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`
    const wrongChain = chain !== undefined && chain.id !== 84532 && chain.id !== 8453
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {wrongChain ? (
          <span className="mono" style={{ padding: '5px 10px', borderRadius: 999, border: `1px solid ${alpha(CF.bear, 25)}`, background: CF.bearTint, color: CF.bearInk, fontSize: 11, fontWeight: 600 }}>
            wrong chain — switch to Base Sepolia
          </span>
        ) : null}
        <button onClick={() => disconnect()} style={{ padding: '8px 12px', borderRadius: CF.radius.md, background: CF.surface, color: CF.ink, border: `1px solid ${CF.line2}`, fontFamily: CF.body, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: wrongChain ? CF.bear : CF.bull }} />
          <span className="mono tnum" style={{ fontSize: 12, color: CF.ink }}>{short}</span>
          <span style={{ color: CF.ink3, fontSize: 11.5 }}>· sign out</span>
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => connect()} disabled={loading} style={baseStyle}>
      {loading ? 'Connecting…' : 'Sign in or connect'}
    </button>
  )
}
