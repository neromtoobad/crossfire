// The match state machine. A market moves through a strict lifecycle and
// nothing advances until the prior step settles:
//
//   OPEN  → calls in, betting open
//   LOCKED → kickoff: betting closes (a call must lock at kickoff or it's
//            meaningless)
//   LIVE  → match in progress, halftime updates
//   SETTLED → full time: result in, receipts posted
//
// Betting is ONLY allowed in OPEN. A market never settles while a debate is
// mid-generation, settlement reads the resolution, which only exists for real,
// already-played matches (lib/resolutions.ts).

import { getResolution } from './resolutions.js'

export type MatchPhase = 'OPEN' | 'LOCKED' | 'LIVE' | 'SETTLED'

export const PHASE_ORDER: MatchPhase[] = ['OPEN', 'LOCKED', 'LIVE', 'SETTLED']

export const PHASE_META: Record<MatchPhase, { label: string; blurb: string; tone: 'open' | 'lock' | 'live' | 'done'; betting: boolean }> = {
  OPEN: { label: 'OPEN', blurb: 'Calls are in. Back or fade, betting closes at kickoff.', tone: 'open', betting: true },
  LOCKED: { label: 'LOCKED', blurb: 'Kickoff, betting is closed. The calls are set.', tone: 'lock', betting: false },
  LIVE: { label: 'LIVE', blurb: 'Match in progress. Halftime read incoming.', tone: 'live', betting: false },
  SETTLED: { label: 'SETTLED', blurb: 'Full time. Result in, agents graded, receipts posted.', tone: 'done', betting: false },
}

// Derive a market's phase. SETTLED iff a real result exists. Otherwise driven by
// the kickoff time (if set): OPEN before kickoff, LIVE during, LOCKED if it has
// kicked off but isn't resolved yet. Markets with no kickoff are OPEN.
// Pass `now` from the server so SSR and the client agree (no hydration drift).
export function matchPhase(call: { marketId: string; kickoffAt?: number }, now: number): MatchPhase {
  if (getResolution(call.marketId) !== 'PENDING') return 'SETTLED'
  const ko = call.kickoffAt
  if (typeof ko !== 'number') return 'OPEN'
  if (now < ko) return 'OPEN'
  if (now < ko + 110 * 60 * 1000) return 'LIVE'
  return 'LOCKED'
}

export function canBet(phase: MatchPhase): boolean {
  return PHASE_META[phase].betting
}
