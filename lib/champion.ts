// THE CHAMPION DRAFT — the whole product, simplified to one bet: you don't bet
// on a match, you bet on a MIND. Back one of the five agents to finish the World
// Cup as the sharpest forecaster. The live leaderboard IS the price: an agent's
// record (real, ESPN/UMA-settled) becomes its win probability and its odds.
//
// Favorite = the current leader = the lowest odds. Longshots pay more. When the
// tournament settles, the champion's backers split the pot.
//
// Client-safe (no node imports) — used by the home Draft Board, BackAgent, and
// the Vault to show a backed agent's live standing.

import type { AgentStats } from './leaderboard.js'
import { ALL_ROLES } from './leaderboard.js'
import { PUNDITS } from './pundits.js'
import type { AgentRole } from './calls-data.js'
import type { SettledMatch } from './wc-results.js' // type only — no fetch dragged in

export type ChampionStanding = {
  role: AgentRole
  handle: string
  portrait: string
  color: string
  persona: string
  archetype: string
  rank: number          // 1 = current favorite
  won: number
  resolved: number
  winRate: number       // 0..1
  brierScore: number
  winProb: number       // 0..1 — modeled chance to be crowned champion
  oddsX: number         // decimal payout multiple (1/winProb), floored
  leading: boolean      // rank === 1
}

// Championship strength: accuracy-dominant, with a calibration bonus (a sharper
// Brier nudges you up) and a small volume reward (more graded calls = more
// trusted). Unproven agents sit at a neutral baseline until they have a record.
function strengthOf(s: AgentStats): number {
  if (s.callsResolved === 0) return 0.35
  return Math.max(
    0.05,
    s.winRate + (0.25 - s.brierScore) * 0.5 + Math.min(0.08, s.callsResolved * 0.008),
  )
}

export function championStandings(stats: AgentStats[]): ChampionStanding[] {
  const scored = stats
    .map((s) => ({ s, strength: strengthOf(s) }))
    .sort((a, b) => b.strength - a.strength) // favorite first

  // Softmax the strengths into win probabilities; temperature K spreads the field
  // so the leader is a clear favorite without crushing the longshots to 0.
  const K = 4.5
  const exps = scored.map((x) => Math.exp(K * x.strength))
  const sum = exps.reduce((a, b) => a + b, 0) || 1

  return scored.map((x, i) => {
    const winProb = exps[i] / sum
    const oddsX = Math.max(1.2, Math.round((1 / winProb) * 10) / 10)
    const p = PUNDITS[x.s.role]
    return {
      role: x.s.role,
      handle: p.handle,
      portrait: p.portrait,
      color: p.color,
      persona: p.persona,
      archetype: p.archetype,
      rank: i + 1,
      won: x.s.callsWon,
      resolved: x.s.callsResolved,
      winRate: x.s.winRate,
      brierScore: x.s.brierScore,
      winProb,
      oddsX,
      leading: i === 0,
    }
  })
}

// Convenience: look up one agent's standing by handle (for the Vault).
export function standingOf(standings: ChampionStanding[], handle: string): ChampionStanding | undefined {
  return standings.find((s) => s.handle.toLowerCase() === handle.toLowerCase())
}

// ── THIS WORLD CUP (2026) only ──────────────────────────────────────────────
// Career standings (above) grade every call ever, including the backtest. These
// grade ONLY the 2026 fixtures actually played, against the real ESPN result —
// the agents' record in the tournament happening right now. Pure: the caller
// passes in getPlayedMatches() (server-only fetch).

export type WCRecord = {
  role: AgentRole
  handle: string
  portrait: string
  color: string
  persona: string
  rank: number
  played: number
  won: number
  lost: number
  winRate: number
}

export function worldCupRecords(matches: SettledMatch[]): WCRecord[] {
  const rows = ALL_ROLES.map((role) => {
    let played = 0, won = 0
    for (const m of matches) {
      const c = m.calls.find((cc) => cc.role === role)
      if (!c) continue
      played += 1
      if (c.vote === m.outcome) won += 1
    }
    const p = PUNDITS[role]
    return {
      role, handle: p.handle, portrait: p.portrait, color: p.color, persona: p.persona,
      played, won, lost: played - won, winRate: played ? won / played : 0,
    }
  })
  // rank by this-tournament win rate, then volume of correct calls
  return rows
    .sort((a, b) => b.winRate - a.winRate || b.won - a.won || b.played - a.played)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// One agent's 2026 scoreboard — the fixtures it called, with HIT/MISS, for the
// agent page.
export type WCMatchResult = {
  id: string; home: string; away: string; score: string; stage: string; favorite: string
  vote: 'YES' | 'NO'; outcome: 'YES' | 'NO'; hit: boolean
}
export function agentWorldCup(matches: SettledMatch[], role: AgentRole): { played: number; won: number; results: WCMatchResult[] } {
  const results: WCMatchResult[] = []
  for (const m of matches) {
    const c = m.calls.find((cc) => cc.role === role)
    if (!c) continue
    results.push({
      id: m.id, home: m.home, away: m.away, score: m.score, stage: m.stage, favorite: m.favorite,
      vote: c.vote, outcome: m.outcome, hit: c.vote === m.outcome,
    })
  }
  return { played: results.length, won: results.filter((r) => r.hit).length, results }
}
