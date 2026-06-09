'use client'

// The Vault — a connected user's positions + active mandates (with revoke).
// Closes the human side of the loop and surfaces the kit's mandate management
// + the revoke kill-switch (a definition-of-done item).

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { ConnectButton } from './ConnectButton'
import { CF, alpha } from '../lib/theme'

type Position = { marketId: string; title: string; yes: string; no: string; impliedProbYes: number; hasPosition: boolean }
type Mandate = { user: string; marketId: string; capUsdc: number; expiresAt: number; revoked?: boolean }

export function Portfolio() {
  const { address, isConnected } = useAccount()
  const [positions, setPositions] = useState<Position[]>([])
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const [p, m] = await Promise.all([
        fetch(`/api/positions?user=${address}`).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/mandate?user=${address}`).then((r) => r.json()).catch(() => ({})),
      ])
      setPositions((p.positions ?? []).filter((x: Position) => x.hasPosition))
      setMandates((m.mandates ?? []).filter((x: Mandate) => !x.revoked))
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { void load() }, [load])

  async function revoke(marketId: string) {
    if (!address) return
    setRevoking(marketId)
    try {
      await fetch('/api/mandate/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: address, marketId }),
      })
      await load()
    } finally { setRevoking(null) }
  }

  if (!isConnected) {
    return (
      <Empty>
        <div style={{ fontFamily: CF.display, fontSize: 24, color: CF.ink, marginBottom: 10 }}>Connect your wallet</div>
        <p style={{ color: CF.ink2, fontSize: 15, lineHeight: 1.55, maxWidth: 380, margin: '0 auto 20px' }}>
          See what you’ve backed, your open stakes, and the spending mandates you’ve granted — with a one-tap revoke.
        </p>
        <ConnectButton variant="primary" />
      </Empty>
    )
  }

  const totalStaked = positions.reduce((s, p) => s + Number(p.yes) + Number(p.no), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          ['POSITIONS', `${positions.length}`],
          ['STAKED', `${totalStaked.toFixed(2)} USDC`],
          ['ACTIVE MANDATES', `${mandates.length}`],
        ].map(([l, v]) => (
          <div key={l} style={{ padding: '16px 18px', background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card }}>
            <div className="mono" style={{ fontSize: 9.5, color: CF.ink4, letterSpacing: 1.4, marginBottom: 8 }}>{l}</div>
            <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, color: CF.ink, letterSpacing: -0.4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* positions */}
      <section>
        <SectionLabel>YOUR POSITIONS</SectionLabel>
        {loading && !positions.length ? <Muted>Reading the chain…</Muted>
          : positions.length === 0 ? (
            <Muted>No positions yet. <Link href="/markets" style={{ color: CF.gold }}>Back an agent’s call →</Link></Muted>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {positions.map((p) => {
                const side = Number(p.yes) >= Number(p.no) ? 'YES' : 'NO'
                const amt = Math.max(Number(p.yes), Number(p.no))
                const col = side === 'YES' ? CF.bull : CF.bear
                return (
                  <div key={p.marketId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: CF.surface, border: `1px solid ${CF.line}`, borderLeft: `3px solid ${col}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card }}>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: CF.body, fontWeight: 600, fontSize: 14.5, color: CF.ink }}>{p.title}</span>
                    <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: col, padding: '3px 8px', borderRadius: CF.radius.sm, background: alpha(col, 12) }}>{side}</span>
                    <span className="mono tnum" style={{ fontSize: 13, color: CF.ink, width: 90, textAlign: 'right' }}>{amt.toFixed(2)} USDC</span>
                  </div>
                )
              })}
            </div>
          )}
      </section>

      {/* mandates */}
      <section>
        <SectionLabel>YOUR MANDATES <span style={{ color: CF.ink4 }}>· chain-enforced spending limits</span></SectionLabel>
        {mandates.length === 0 ? (
          <Muted>No active mandates. You grant one when you back a call — it caps what an agent can ever spend.</Muted>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mandates.map((m) => {
              const hrs = Math.max(0, Math.round((m.expiresAt - Date.now()) / 3.6e6))
              return (
                <div key={m.marketId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: CF.body, fontWeight: 600, fontSize: 14, color: CF.ink }}>{m.marketId}</div>
                    <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 3 }}>
                      cap <span style={{ color: CF.gold, fontWeight: 600 }}>{m.capUsdc} USDC</span> · expires in {hrs}h
                    </div>
                  </div>
                  <button onClick={() => revoke(m.marketId)} disabled={revoking === m.marketId} style={{
                    padding: '8px 16px', borderRadius: CF.radius.md, cursor: revoking === m.marketId ? 'wait' : 'pointer',
                    background: 'transparent', border: `1px solid ${alpha(CF.bear, 45)}`, color: CF.bear,
                    fontFamily: CF.body, fontWeight: 600, fontSize: 12.5,
                  }}>
                    {revoking === m.marketId ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.6, color: CF.ink3, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'inline-block', width: 16, height: 1, background: CF.ink }} />{children}
    </div>
  )
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: CF.body, fontSize: 14, color: CF.ink3, padding: '16px 0' }}>{children}</div>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: 'center', padding: '64px 24px', background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg }}>{children}</div>
}
