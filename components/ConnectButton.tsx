'use client'

// Connect-wallet button — MetaMask (or any injected) via wagmi.
// Editorial-light treatment (Phase 8.11 audit).

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react'
import { CF } from '../lib/theme'

export function ConnectButton({ variant = 'primary' }: { variant?: 'primary' | 'ghost' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { address, status, chain } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

  const isConnected = status === 'connected'
  const isReconnecting = status === 'reconnecting' || status === 'connecting'

  // Inert placeholder with the same footprint so the layout doesn't jump.
  if (!mounted || isReconnecting) {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: CF.radius.md,
          background: CF.surface, color: CF.ink3,
          fontFamily: CF.body, fontSize: 13, fontWeight: 500,
          border: `1px solid ${CF.line}`,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: CF.ink4, opacity: 0.6 }} />
        {mounted ? 'reconnecting…' : ''}
      </span>
    )
  }

  const baseStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          padding: '10px 16px',
          borderRadius: CF.radius.md,
          background: CF.ink,
          color: CF.bg,
          fontFamily: CF.body,
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }
      : {
          padding: '8px 12px',
          borderRadius: CF.radius.md,
          background: 'transparent',
          color: CF.ink2,
          fontFamily: CF.body,
          fontSize: 13,
          fontWeight: 500,
          border: `1px solid ${CF.line}`,
          cursor: 'pointer',
        }

  // ── Connected ─────────────────────────────────────────────────────────
  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`
    const wrongChain = chain !== undefined && chain.id !== 84532 && chain.id !== 8453
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {wrongChain ? (
          <span
            className="mono"
            style={{
              padding: '5px 10px', borderRadius: 999,
              border: `1px solid ${CF.bear}40`,
              background: CF.bearTint,
              color: CF.bearInk,
              fontSize: 11, fontWeight: 600,
            }}
          >
            wrong chain — switch to Base Sepolia
          </span>
        ) : null}
        <button
          onClick={() => disconnect()}
          style={{
            padding: '8px 12px',
            borderRadius: CF.radius.md,
            background: CF.surface,
            color: CF.ink,
            border: `1px solid ${CF.line2}`,
            fontFamily: CF.body, fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: 999,
              background: wrongChain ? CF.bear : CF.bull,
            }}
          />
          <span className="mono tnum" style={{ fontSize: 12, color: CF.ink }}>{short}</span>
          <span style={{ color: CF.ink3, fontSize: 11.5 }}>· disconnect</span>
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
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              minWidth: 240,
              background: CF.surface,
              border: `1px solid ${CF.line}`,
              borderRadius: CF.radius.lg,
              padding: 8, zIndex: 51,
              boxShadow: CF.shadow.pop,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10.5, color: CF.ink3, letterSpacing: 1.6,
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
                  display: 'flex', alignItems: 'center',
                  width: '100%', padding: '10px 12px',
                  borderRadius: CF.radius.md,
                  background: 'transparent', border: 'none',
                  color: CF.ink,
                  fontFamily: CF.body, fontSize: 13.5, fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = CF.surface2 }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {c.name}
              </button>
            ))}
            {error ? (
              <div
                className="mono"
                style={{
                  padding: '8px 12px',
                  fontSize: 11, color: CF.bear,
                  borderTop: `1px solid ${CF.line}`, marginTop: 6,
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
