// Call resolutions — used by the leaderboard to score per-role calibration.
//
// HARD RULE: a market resolves ONLY if it is a real, already-played event.
// The single source of resolutions is lib/historical-matches.ts (real World
// Cup / Euro / Copa América results). Anything not in that set — every 2026
// market, every speculative future event — is PENDING, forever. We never
// invent a result for a game that hasn't aired.
//
// There is deliberately NO hand-set resolution map here. If you want a market
// graded, add the real match (with its real outcome) to historical-matches.ts.

import { HISTORICAL_RESOLUTIONS } from './historical-matches.js'

export type Resolution = 'YES' | 'NO' | 'PENDING'

export function getResolution(marketId: string): Resolution {
  return HISTORICAL_RESOLUTIONS[marketId] ?? 'PENDING'
}
