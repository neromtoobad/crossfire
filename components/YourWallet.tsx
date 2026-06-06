'use client'

// Phase 7.6 — per-user dashboard section. Reads the connected wallet's
// active mandates + positions across all markets, and provides an
// on-chain Revoke button that calls DelegationManager.disableDelegation.

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { parseAbi } from 'viem'

const CF = {
  bg: '#060608', panel: '#0c0c11', edge: '#1b1b23', edgeHi: '#2a2a36',
  text: '#ededf2', dim: '#8a8a99', dimmer: '#5a5a68',
  bull: '#3bc4ff', bear: '#ff2a4d', amber: '#ffbd45', white: '#ffffff',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

// DelegationManager.disableDelegation(Delegation calldata)
const dmAbi = parseAbi([
  'function disableDelegation((address delegate,address delegator,bytes32 authority,(address enforcer,bytes terms,bytes args)[] caveats,uint256 salt,bytes signature) _delegation)',
])

type Mandate = {
  user: string
  marketId: string
  marketAddress: string
  capUsdc: number
  capWei: string
  expiresAt: number
  signedAt: number
  delegationManager: string
  chainId: number
  signedDelegation: any // shape from the kit
  revoked?: boolean
}

type Position = {
  marketId: string
  title: string
  address: string
  yes: string
  no: string
  totalYes: string
  totalNo: string
  impliedProbYes: number
  hasPosition: boolean
}

export function YourWallet() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [usdcBal, setUsdcBal] = useState<string>('—')
  const [positions, setPositions] = useState<Position[]>([])
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokeErr, setRevokeErr] = useState<string | null>(null)

  async function refresh() {
    if (!address) return
    setLoading(true)
    try {
      const [posRes, mandateList] = await Promise.all([
        fetch(`/api/positions?user=${address}`).then((r) => r.json()),
        loadAllMandates(address),
      ])
      if (posRes.ok) {
        setPositions(posRes.positions)
        setUsdcBal(posRes.usdcBalance ?? '0')
      }
      setMandates(mandateList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) refresh()
    else {
      setPositions([]); setMandates([]); setUsdcBal('—')
    }
  }, [isConnected, address])

  async function handleRevoke(m: Mandate) {
    if (!address) return
    setRevokeErr(null)
    setRevokingId(m.marketId)
    try {
      // Build the Delegation tuple for DM.disableDelegation
      const d = m.signedDelegation
      const tuple = {
        delegate: d.delegate as `0x${string}`,
        delegator: d.delegator as `0x${string}`,
        authority: d.authority as `0x${string}`,
        caveats: (d.caveats ?? []).map((c: any) => ({
          enforcer: c.enforcer as `0x${string}`,
          terms: c.terms as `0x${string}`,
          args: c.args as `0x${string}`,
        })),
        salt: BigInt(d.salt),
        signature: d.signature as `0x${string}`,
      }

      const txHash = await writeContractAsync({
        address: m.delegationManager as `0x${string}`,
        abi: dmAbi,
        functionName: 'disableDelegation',
        args: [tuple],
      })

      // Wait for receipt so the user sees the on-chain confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
      }

      // Server-side soft-revoke so /api/duel/run won't attempt redemption
      await fetch('/api/mandate/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: address, marketId: m.marketId }),
      })

      await refresh()
    } catch (e) {
      setRevokeErr((e as Error).message.slice(0, 200))
    } finally {
      setRevokingId(null)
    }
  }

  if (!isConnected) return null

  const activeMandates = mandates.filter((m) => !m.revoked && m.expiresAt > Date.now())
  const positionsWithBets = positions.filter((p) => p.hasPosition)

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 12,
      }}>
        <h2 style={{
          fontFamily: CF.display, fontWeight: 700, fontSize: 18, color: CF.text,
          margin: 0, letterSpacing: -0.2,
        }}>
          Your wallet
        </h2>
        <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>{address?.slice(0, 6)}…{address?.slice(-4)}</span>
          <span style={{ color: CF.edgeHi }}>·</span>
          <span>{usdcBal} USDC</span>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: '4px 10px', borderRadius: 6, background: 'transparent',
              border: `1px solid ${CF.edge}`, color: CF.dim,
              fontFamily: CF.mono, fontSize: 11, cursor: 'pointer',
            }}
          >
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {/* MANDATES */}
      <div style={{ ...panelStyle(), marginBottom: 10 }}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6, marginBottom: 12 }}>
          ACTIVE MANDATES
        </div>
        {activeMandates.length === 0 ? (
          <div style={{ fontFamily: CF.mono, fontSize: 12, color: CF.dim }}>
            No active mandates. Pick a market above to grant one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeMandates.map((m) => {
              const remainingHrs = Math.max(0, (m.expiresAt - Date.now()) / 3600000)
              const market = positions.find((p) => p.marketId === m.marketId)
              return (
                <div
                  key={m.marketId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: CF.bg,
                    border: `1px solid ${CF.edge}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: CF.display, fontSize: 13, fontWeight: 600, color: CF.text, marginBottom: 2 }}>
                      {market?.title ?? m.marketId}
                    </div>
                    <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim }}>
                      {m.marketAddress.slice(0, 8)}…{m.marketAddress.slice(-4)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: CF.mono, fontSize: 14, fontWeight: 600, color: CF.bull }}>
                      {m.capUsdc} <span style={{ color: CF.dim, fontSize: 11 }}>USDC</span>
                    </div>
                    <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dim }}>cap</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: CF.mono, fontSize: 12.5, color: CF.text }}>
                      {remainingHrs.toFixed(1)}h
                    </div>
                    <div style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dim }}>left</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a
                      href={`/duel/${m.marketId}`}
                      style={{
                        padding: '8px 12px', borderRadius: 7, textDecoration: 'none',
                        background: CF.text, color: '#000',
                        fontFamily: CF.display, fontSize: 12, fontWeight: 600,
                      }}
                    >
                      Run duel →
                    </a>
                    <button
                      onClick={() => handleRevoke(m)}
                      disabled={revokingId === m.marketId}
                      style={{
                        padding: '8px 12px', borderRadius: 7, cursor: revokingId === m.marketId ? 'not-allowed' : 'pointer',
                        background: revokingId === m.marketId ? CF.dim : 'transparent',
                        border: `1px solid ${CF.bear}`, color: CF.bear,
                        fontFamily: CF.mono, fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
                      }}
                    >
                      {revokingId === m.marketId ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {revokeErr ? (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            background: `color-mix(in oklab, ${CF.bear} 10%, transparent)`,
            border: `1px solid ${CF.bear}`, color: CF.bear,
            fontFamily: CF.mono, fontSize: 11, wordBreak: 'break-word',
          }}>
            {revokeErr}
          </div>
        ) : null}
      </div>

      {/* POSITIONS */}
      <div style={panelStyle()}>
        <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, letterSpacing: 1.6, marginBottom: 12 }}>
          POSITIONS
        </div>
        {positionsWithBets.length === 0 ? (
          <div style={{ fontFamily: CF.mono, fontSize: 12, color: CF.dim }}>
            No positions yet. Grant a mandate and run a duel.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {positionsWithBets.map((p) => (
              <div
                key={p.marketId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: CF.bg,
                  border: `1px solid ${CF.edge}`,
                  borderRadius: 8,
                }}
              >
                <div style={{ fontFamily: CF.display, fontSize: 13, color: CF.text }}>{p.title}</div>
                <div style={{ display: 'flex', gap: 14, fontFamily: CF.mono, fontSize: 12 }}>
                  <span style={{ color: CF.bull }}>YES {p.yes}</span>
                  <span style={{ color: CF.bear }}>NO {p.no}</span>
                </div>
                <a
                  href={`https://sepolia.basescan.org/address/${p.address}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, textDecoration: 'none' }}
                >
                  market ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────
async function loadAllMandates(user: string): Promise<Mandate[]> {
  // We don't have a "list all for user" endpoint yet; iterate over known markets.
  const markets = ['btc-200k-2026', 'fed-rate-cut', 'trump-sbf-pardon', 'openai-gpt6-2026']
  const out: Mandate[] = []
  for (const id of markets) {
    try {
      const r = await fetch(`/api/mandate?user=${user}&marketId=${id}`).then((x) => x.json())
      if (r.ok && r.active) out.push(r.active)
    } catch { /* skip */ }
  }
  return out
}

function panelStyle(): React.CSSProperties {
  return {
    background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
    padding: '16px 18px',
  }
}
