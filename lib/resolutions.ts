// Call resolutions — PURE + client-safe (no network imports; client components
// like CallCard import this for the sync backtest grade).
//
// HARD RULE: a market resolves ONLY against a real, authoritative result. We
// never invent an outcome. Two sources exist:
//
//   1. Backtest — real, already-played matches (lib/historical-matches.ts:
//      2018–2024 World Cups / Euros / Copa América, public results) — THIS file.
//   2. UMA Optimistic Oracle via Polymarket — async + server-only; see
//      lib/settlement.ts (resolveMarket) and GET /api/settlement.
//
// Anything with no real result yet stays PENDING, forever. No hand-set map.

import { HISTORICAL_RESOLUTIONS } from './historical-matches.js'

export type Resolution = 'YES' | 'NO' | 'PENDING'

export function getResolution(marketId: string): Resolution {
  return HISTORICAL_RESOLUTIONS[marketId] ?? 'PENDING'
}
