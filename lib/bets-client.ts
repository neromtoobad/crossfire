// Client-side bet store (localStorage, keyed by wallet).
//
// WHY NOT THE SERVER: Vercel's serverless filesystem is read-only except /tmp,
// and /tmp is per-instance + ephemeral — a bet written on one invocation's
// instance is invisible to the Vault read that lands on another. So a server
// file store silently "loses" bets in production. The bet is per-user demo
// state and the wallet is the identity, so the durable place for it is the
// user's own browser. The on-chain proof (the ERC-7715 permission context the
// wallet returned) is stored alongside each bet, so the Vault can show it.

import { getResolution } from './resolutions.js'
import type { AgentRole } from './calls-data.js'

export type BetProof = {
  context: string                 // the ERC-7715 permission context (the receipt)
  delegationManager?: string
  capUsdc: number
  expiry: number                  // unix SECONDS
  redeemer: string
  chainId: number
}

export type StoredBet = {
  user: string                    // wallet address, lowercased
  callId: string                  // for champion bets: `champion:<role>`
  marketId: string
  marketTitle: string
  agentHandle: string
  choice: 'follow' | 'fade'
  side: 'YES' | 'NO'
  amountUsdc: number
  ts: number
  proof?: BetProof
  // Champion Draft: you backed an AGENT to win the tournament, not a match call.
  kind?: 'call' | 'champion'
  agentRole?: AgentRole
  oddsX?: number                  // decimal odds locked in at bet time
}

export type EnrichedBet = StoredBet & {
  resolution: 'YES' | 'NO' | 'PENDING'
  outcome: 'won' | 'lost' | 'pending'
}

const KEY = 'cf-bets-v1'

function readAll(): StoredBet[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(KEY) || '[]') as StoredBet[] } catch { return [] }
}
function writeAll(bets: StoredBet[]): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(bets)) } catch { /* private mode / quota — best effort */ }
}

/** One bet per user+call; re-backing updates it. */
export function recordBetLocal(b: StoredBet): void {
  const user = b.user.toLowerCase()
  const kept = readAll().filter((x) => !(x.user.toLowerCase() === user && x.callId === b.callId))
  kept.push({ ...b, user })
  writeAll(kept)
}

/** The user's bets, newest first, each graded against the real resolution. */
export function listBetsLocal(user: string): EnrichedBet[] {
  const u = user.toLowerCase()
  return readAll()
    .filter((b) => b.user.toLowerCase() === u)
    .sort((a, b) => b.ts - a.ts)
    .map((b) => {
      const resolution = getResolution(b.marketId) // 'YES' | 'NO' | 'PENDING'
      const outcome = resolution === 'PENDING' ? 'pending' : b.side === resolution ? 'won' : 'lost'
      return { ...b, resolution, outcome }
    })
}
