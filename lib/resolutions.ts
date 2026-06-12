// Call resolutions.
//
// HARD RULE: a market resolves ONLY against a real, authoritative result. We
// never invent an outcome. There are exactly two sources:
//
//   1. Backtest — real, already-played matches (lib/historical-matches.ts:
//      2018–2024 World Cups / Euros / Copa América, public results).
//   2. UMA Optimistic Oracle, via Polymarket — for live markets that carry a
//      Polymarket slug. Polymarket settles through UMA's decentralized,
//      disputable, on-chain oracle; we read that settlement, we don't decide it.
//
// Anything with no real result yet stays PENDING, forever. No hand-set map.

import { HISTORICAL_RESOLUTIONS } from './historical-matches.js'
import { getPolymarketResolution } from './polymarket.js'

export type Resolution = 'YES' | 'NO' | 'PENDING'

export type ResolvedMarket = {
  status: Resolution
  via: 'backtest' | 'uma' | 'pending'
  resolvedBy?: string | null   // the UMA on-chain resolver, when via === 'uma'
  source: string               // human label for the UI
}

// Synchronous — backtest only. Used by server components that render without an
// await (the leaderboard, feed cards). Live (UMA) settlement is async, below.
export function getResolution(marketId: string): Resolution {
  return HISTORICAL_RESOLUTIONS[marketId] ?? 'PENDING'
}

// Authoritative resolution: real backtest result first, else UMA via Polymarket.
// Returns PENDING until an actual result exists — never a guess.
export async function resolveMarket(marketId: string, polymarketSlug?: string | null): Promise<ResolvedMarket> {
  const hist = HISTORICAL_RESOLUTIONS[marketId]
  if (hist) return { status: hist, via: 'backtest', source: 'Real result · backtest' }

  if (polymarketSlug) {
    const r = await getPolymarketResolution(polymarketSlug).catch(() => null)
    if (r && r.status !== 'PENDING') {
      return { status: r.status, via: 'uma', resolvedBy: r.resolvedBy, source: 'UMA Optimistic Oracle · Polymarket' }
    }
  }

  return { status: 'PENDING', via: 'pending', source: 'Open — settles on the real result' }
}
