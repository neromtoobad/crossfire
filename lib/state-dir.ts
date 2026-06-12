// Where runtime state + caches (voice mp3s, verdict cards, winner picks, bets,
// mandates, relayer state, polymarket cache) are written.
//
// Vercel's serverless filesystem is READ-ONLY except for /tmp. Writing under the
// project dir there throws EROFS. So in production we route everything to
// /tmp/.crossfire; locally we keep the project's .crossfire (gitignored).
//
// /tmp is per-instance + ephemeral, which is fine for caches and demo state.

import { resolve } from 'node:path'

export const STATE_BASE = process.env.VERCEL
  ? '/tmp/.crossfire'
  : resolve(process.cwd(), '.crossfire')
