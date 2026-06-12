// The agents' receipts — shown on REAL, already-played World Cup matches with
// REAL final scores (public record). No invented 2026 results: those markets
// stay OPEN until the matches are actually played and settled against an
// authoritative result. This is the accountability loop, graded on what truly
// happened.

import type { AgentRole } from './calls-data.js'

export type SettledCall = { role: AgentRole; vote: 'YES' | 'NO'; confidence: number }

export type SettledMatch = {
  id: string
  home: string; homeFlag: string  // home = framed favourite (display order)
  away: string; awayFlag: string
  score: string                   // REAL final score, home–away
  stage: string                   // real competition + round
  market: string                  // the binary the agents called
  favorite: string
  outcome: 'YES' | 'NO'           // REAL: did the favourite win
  story: string
  source: string                  // where the result is verifiable
  calls: SettledCall[]
}

// Two real, verifiable matches — the most famous shock of 2022, and a chalk
// semi-final the same favourite won comfortably. The agents apply their fixed
// styles (favourite-backers lean YES; VEGA the contrarian fades), then get
// graded against the actual result.
export const SETTLED_MATCHES: SettledMatch[] = [
  {
    id: 'arg-ksa-2022',
    home: 'Argentina', homeFlag: '🇦🇷',
    away: 'Saudi Arabia', awayFlag: '🇸🇦',
    score: '1–2',
    stage: '2022 World Cup · Group C',
    market: 'Argentina to beat Saudi Arabia',
    favorite: 'Argentina',
    outcome: 'NO', // Argentina, the eventual champions, lost
    story: 'The biggest shock of the tournament — Saudi Arabia stunned the eventual champions.',
    source: 'public record',
    calls: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.84 },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.81 },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.79 },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.80 },
      { role: 'Skeptic', vote: 'NO', confidence: 0.58 }, // VEGA faded the heavy favourite
    ],
  },
  {
    id: 'arg-cro-2022',
    home: 'Argentina', homeFlag: '🇦🇷',
    away: 'Croatia', awayFlag: '🇭🇷',
    score: '3–0',
    stage: '2022 World Cup · Semi-final',
    market: 'Argentina to beat Croatia',
    favorite: 'Argentina',
    outcome: 'YES', // Argentina won 3–0
    story: 'Messi and Álvarez ran the semi — the favourite never looked troubled.',
    source: 'public record',
    calls: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.66 },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.63 },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.64 },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.62 },
      { role: 'Skeptic', vote: 'NO', confidence: 0.55 }, // VEGA faded — burned this time
    ],
  },
]

export function hits(m: SettledMatch): number {
  return m.calls.filter((c) => c.vote === m.outcome).length
}
