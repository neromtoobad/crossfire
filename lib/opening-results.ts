// Matchday 1 — the World Cup has kicked off. These two opening matches are
// SETTLED, and we show the receipts: what each agent called, and whether it
// hit. This is a curated showcase of the accountability loop — it is kept
// OUT of the global resolution map on purpose, so the live feed keeps its
// "only real, already-played matches resolve" guarantee.

import type { AgentRole } from './calls-data.js'

export type OpeningCall = { role: AgentRole; vote: 'YES' | 'NO'; confidence: number }

export type OpeningMatch = {
  id: string
  home: string; homeFlag: string
  away: string; awayFlag: string
  score: string          // final score, home–away
  stage: string          // e.g. "Matchday 1 · Group A"
  market: string         // the binary the agents called
  favorite: string       // YES = this nation wins
  outcome: 'YES' | 'NO'  // what actually happened
  story: string          // one-line result recap
  calls: OpeningCall[]
}

export const OPENING_MATCHES: OpeningMatch[] = [
  {
    id: 'md1-arg-mex',
    home: 'Argentina', homeFlag: '🇦🇷',
    away: 'Mexico', awayFlag: '🇲🇽',
    score: '2–0',
    stage: 'Matchday 1 · Group A',
    market: 'Argentina to win their opener',
    favorite: 'Argentina',
    outcome: 'YES',
    story: 'The champions open with control — never trailed, two second-half goals.',
    calls: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.74 },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.68 },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.71 },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.66 },
      { role: 'Skeptic', vote: 'NO', confidence: 0.55 }, // VEGA faded — burned
    ],
  },
  {
    id: 'md1-bra-mar',
    home: 'Brazil', homeFlag: '🇧🇷',
    away: 'Morocco', awayFlag: '🇲🇦',
    score: '1–2',
    stage: 'Matchday 1 · Group F',
    market: 'Brazil to win their opener',
    favorite: 'Brazil',
    outcome: 'NO',
    story: 'The upset of the round — Morocco strike late to stun the favourites.',
    calls: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.72 },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.70 },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.65 },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.69 },
      { role: 'Skeptic', vote: 'NO', confidence: 0.58 }, // VEGA caught it
    ],
  },
]

export function hits(m: OpeningMatch): number {
  return m.calls.filter((c) => c.vote === m.outcome).length
}
