'use client'

// Connect-wallet button — MetaMask (or any injected) via wagmi.
// Self-contained styling that matches the landing/dashboard token palette.

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react'

const CF = {
  bull: '#3bc4ff',
  bear: '#ff2a4d',
  panel: '#0c0c11',
  edge: '#1b1b23',
  edgeHi: '#2a2a36',
  text: '#ededf2',
  dim: '#8a8a99',
  dimmer: '#5a5a68',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

export function ConnectButton({ variant = 'primary' }: { variant?: 'primary' | 'ghost' }) {
  // wagmi hydration guard — see GrantMandate for the same pattern.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { address, status, chain } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

  const isConnected = status === 'connected'
  const isReconnecting = status === 'reconnecting' || status === 'connecting'

  // Until wagmi hydrates, render an inert placeholder with the same footprint
  // so the layout doesn't jump and users with a session don't see "Connect"
  // for a frame before reconnect lands.
  if (!mounted || isReconnecting) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 8,
          background: CF.panel,
          color: CF.dim,
          fontFamily: CF.mono,
          fontSize: 12,
          letterSpacing: 0.3,
          border: `1px solid ${CF.edge}`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: CF.dim,
            opacity: 0.6,
          }}
        />
        {mounted ? 'reconnecting…' : ''}
      </span>
    )
  }

  const baseStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          padding: '10px 18px',
          borderRadius: 8,
          background: CF.text,
          color: '#000',
          fontFamily: CF.display,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.3,
          border: 'none',
          cursor: 'pointer',
          boxShadow: `0 0 20px color-mix(in oklab, ${CF.bull} 18%, transparent)`,
        }
      : {
          padding: '8px 14px',
          borderRadius: 7,
          background: 'transparent',
          color: CF.dim,
          fontFamily: CF.mono,
          fontSize: 12,
          letterSpacing: 0.3,
          border: `1px solid ${CF.edge}`,
          cursor: 'pointer',
        }

  // ── Connected ─────────────────────────────────────────────────────────
  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`
    // Only flag wrong chain when chain is ACTUALLY known and not one we support.
    // wagmi may report chain as undefined briefly while reconciling — don't
    // treat undefined as a wrong chain (it just means: not yet known).
    const wrongChain = chain !== undefined && chain.id !== 84532 && chain.id !== 8453
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {wrongChain ? (
          <span
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: `1px solid ${CF.bear}`,
              background: `color-mix(in oklab, ${CF.bear} 14%, transparent)`,
              color: CF.bear,
              fontFamily: CF.mono,
              fontSize: 11,
            }}
          >
            wrong chain — switch to Base Sepolia
          </span>
        ) : null}
        <button
          onClick={() => disconnect()}
          style={{
            ...baseStyle,
            background: CF.panel,
            color: CF.text,
            border: `1px solid ${CF.edgeHi}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: wrongChain ? CF.bear : CF.bull,
              boxShadow: `0 0 6px ${wrongChain ? CF.bear : CF.bull}`,
            }}
          />
          <span style={{ fontFamily: CF.mono, fontSize: 12 }}>{short}</span>
          <span style={{ color: CF.dim, fontSize: 11 }}>· disconnect</span>
        </button>
      </div>
    )
  }

  // ── Not connected ─────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        style={baseStyle}
      >
        {isPending ? 'Connecting…' : 'Connect wallet'}
      </button>

      {open && (
        <>
          {/* click-outside backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              minWidth: 240,
              background: CF.panel,
              border: `1px solid ${CF.edgeHi}`,
              borderRadius: 10,
              padding: 8,
              zIndex: 51,
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                fontFamily: CF.mono,
                fontSize: 10.5,
                color: CF.dim,
                letterSpacing: 1.6,
                padding: '6px 10px 10px',
              }}
            >
              CHOOSE WALLET
            </div>
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect({ connector: c })
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  color: CF.text,
                  fontFamily: CF.display,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = `color-mix(in oklab, ${CF.bull} 10%, transparent)`
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {c.name}
              </button>
            ))}
            {error ? (
              <div
                style={{
                  padding: '8px 12px',
                  fontFamily: CF.mono,
                  fontSize: 11,
                  color: CF.bear,
                  borderTop: `1px solid ${CF.edge}`,
                  marginTop: 6,
                }}
              >
                {error.message.slice(0, 120)}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
