// The agents' receipts — graded on REAL 2026 World Cup results as they're
// actually played. We only list a match here once its final score is confirmed
// by authoritative sources (FIFA/ESPN) and/or settled on-chain by UMA via
// Polymarket. No invented scores. Matches without a confirmed result stay out
// of this list and their markets stay OPEN.

import type { AgentRole } from './calls-data.js'

export type SettledCall = { role: AgentRole; vote: 'YES' | 'NO'; confidence: number }

export type SettledMatch = {
  id: string
  home: string; homeFlag: string  // home = framed favourite (display order)
  away: string; awayFlag: string
  score: string                   // REAL final score, home–away
  stage: string                   // real competition + group + date
  market: string                  // the binary the agents called
  favorite: string
  outcome: 'YES' | 'NO'           // REAL: did the favourite win
  story: string                   // result recap (with verifiable detail)
  source: string                  // where the result is verifiable
  calls: SettledCall[]
}

// CONFIRMED, played results only. As of now the tournament's opening match is
// the single result authoritative sources agree on; more get added here as
// they're actually played and settled.
export const SETTLED_MATCHES: SettledMatch[] = [
  {
    id: 'mex-rsa-2026',
    home: 'Mexico', homeFlag: '🇲🇽',
    away: 'South Africa', awayFlag: '🇿🇦',
    score: '2–0',
    stage: '2026 World Cup · Group A · Jun 11',
    market: 'Mexico to beat South Africa',
    favorite: 'Mexico',
    outcome: 'YES', // hosts won the opener
    story: 'The opener at the Azteca — Quiñones (9′) and Jiménez (67′) sealed it; the hosts never trailed.',
    source: 'FIFA · ESPN',
    calls: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.74 },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.70 },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.72 },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.68 },
      { role: 'Skeptic', vote: 'NO', confidence: 0.56 }, // VEGA faded the host — burned
    ],
  },
]

export function hits(m: SettledMatch): number {
  return m.calls.filter((c) => c.vote === m.outcome).length
}
