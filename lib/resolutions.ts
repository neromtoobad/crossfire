// Call resolutions — used by the leaderboard to score per-role calibration.
//
// In production these would come from oracles or settled markets. For the
// hackathon demo they're hand-set so judges can see real Brier scores
// across the council without waiting months for markets to resolve.
//
// 'PENDING' means the market is still open — those calls don't contribute
// to the score (they show in the "open" tally on the leaderboard).

export type Resolution = 'YES' | 'NO' | 'PENDING'

// Keyed by marketId (NOT callId) so this survives council re-runs.
// Markets that resolved to YES = the literal yes outcome happened;
// NO = it didn't or was decided false; PENDING = still open.
//
// These are illustrative resolutions matching the sample feed —
// good enough to show the leaderboard mechanism working.
export const RESOLUTIONS: Record<string, Resolution> = {
  // ── Resolved (illustrative, for demo scoring) ─────────────────────────
  'trump-sbf-pardon':   'NO',   // politics — no pardon happened
  'fed-rate-cut':       'NO',   // macro    — Fed held at most-recent FOMC
  'openai-gpt6-2026':   'YES',  // tech     — GPT-6 announced in window
  'wc-final-penalties': 'NO',   // sports   — final decided in regulation
  'sol-flip-eth-2026':  'NO',   // crypto   — SOL did not flip ETH
  'apple-fold-2026':    'NO',   // tech     — no foldable iPhone shipped
  'us-10y-above-5':     'NO',   // macro    — 10y stayed below 5%

  // ── Still open — don't count toward score, shown as PENDING ───────────
  'btc-200k-2026':      'PENDING',
  'wc-argentina-2026':  'PENDING',
  'wc-messi-scores':    'PENDING',
}

export function getResolution(marketId: string): Resolution {
  return RESOLUTIONS[marketId] ?? 'PENDING'
}
