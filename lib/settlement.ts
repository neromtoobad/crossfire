// Authoritative market settlement, SERVER-ONLY (pulls the Polymarket/UMA
// oracle over the network). Client components needing the sync backtest grade
// import lib/resolutions.ts instead, which stays pure.
//
// Resolution order:
//   1. Backtest, real, already-played matches (public results).
//   2. UMA Optimistic Oracle via Polymarket, for live markets with a slug.
//   3. PENDING, until a real result exists. Never a guess.

import { HISTORICAL_RESOLUTIONS } from './historical-matches.js'
import { getPolymarketResolution } from './polymarket.js'
import type { Resolution } from './resolutions.js'

export type ResolvedMarket = {
  status: Resolution
  via: 'backtest' | 'uma' | 'pending'
  resolvedBy?: string | null   // the UMA on-chain resolver, when via === 'uma'
  source: string               // human label for the UI
}

export async function resolveMarket(marketId: string, polymarketSlug?: string | null): Promise<ResolvedMarket> {
  const hist = HISTORICAL_RESOLUTIONS[marketId]
  if (hist) return { status: hist, via: 'backtest', source: 'Real result · backtest' }

  if (polymarketSlug) {
    const r = await getPolymarketResolution(polymarketSlug).catch(() => null)
    if (r && r.status !== 'PENDING') {
      return { status: r.status, via: 'uma', resolvedBy: r.resolvedBy, source: 'UMA Optimistic Oracle · Polymarket' }
    }
  }

  return { status: 'PENDING', via: 'pending', source: 'Open, settles on the real result' }
}
