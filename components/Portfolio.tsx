'use client'

// The Vault — a connected user's positions + active mandates (with revoke).
// Closes the human side of the loop and surfaces the kit's mandate management
// + the revoke kill-switch (a definition-of-done item).

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { ConnectButton } from './ConnectButton'
import { CF, alpha } from '../lib/theme'

type Bet = {
  callId: string; marketId: string; marketTitle: string; agentHandle: string
  choice: 'follow' | 'fade'; side: 'YES' | 'NO'; amountUsdc: number; ts: number
  resolution: 'YES' | 'NO' | 'PENDING'; outcome: 'won' | 'lost' | 'pending'
}
type Mandate = { user: string; marketId: string; capUsdc: number; expiresAt: number; revoked?: boolean }

export function Portfolio() {
  const { address, isConnected } = useAccount()
  const [bets, setBets] = useState<Bet[]>([])
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const [b, m] = await Promise.all([
        fetch(`/api/bets?user=${address}`).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/mandate?user=${address}`).then((r) => r.json()).catch(() => ({})),
      ])
      setBets((b.bets ?? []) as Bet[])
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

  const totalStaked = bets.reduce((s, b) => s + b.amountUsdc, 0)
  const wins = bets.filter((b) => b.outcome === 'won').length
  const settled = bets.filter((b) => b.outcome !== 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* summary */}
      <div className="cf-g3" style={{ gap: 12 }}>
        {[
          ['BACKED CALLS', `${bets.length}`],
          ['STAKED', `${totalStaked.toFixed(0)} USDC`],
          ['RECORD', settled ? `${wins}/${settled} won` : '—'],
        ].map(([l, v]) => (
          <div key={l} style={{ padding: '16px 18px', background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card }}>
            <div className="mono" style={{ fontSize: 9.5, color: CF.ink4, letterSpacing: 1.4, marginBottom: 8 }}>{l}</div>
            <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, color: CF.ink, letterSpacing: -0.4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* backed calls */}
      <section>
        <SectionLabel>YOUR BACKED CALLS</SectionLabel>
        {loading && !bets.length ? <Muted>Loading…</Muted>
          : bets.length === 0 ? (
            <Muted>You haven’t backed a call yet. <Link href="/markets" style={{ color: CF.gold }}>Fade or follow an agent →</Link></Muted>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bets.map((b) => {
                const col = b.side === 'YES' ? CF.bull : CF.bear
                const oc = b.outcome === 'won' ? CF.positive : b.outcome === 'lost' ? CF.bear : CF.ink3
                const ocLabel = b.outcome === 'won' ? '✓ WON' : b.outcome === 'lost' ? '✗ LOST' : 'OPEN'
                return (
                  <Link key={b.callId} href={`/calls/${b.callId}`} className="cf-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: CF.surface, border: `1px solid ${CF.line}`, borderLeft: `3px solid ${oc}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: CF.body, fontWeight: 600, fontSize: 14.5, color: CF.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.marketTitle}</div>
                      <div className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 3 }}>
                        {b.choice === 'fade' ? 'faded' : 'followed'} <span style={{ color: CF.ink2, fontWeight: 600 }}>{b.agentHandle}</span> · bet {b.side}
                      </div>
                    </div>
                    <span className="mono tnum" style={{ fontSize: 13, color: CF.ink, width: 64, textAlign: 'right' }}>{b.amountUsdc} USDC</span>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: oc, width: 50, textAlign: 'right' }}>{ocLabel}</span>
                  </Link>
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
