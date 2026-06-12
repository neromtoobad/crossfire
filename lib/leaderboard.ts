// Per-role calibration math.
//
// Brier score = mean squared error of probability forecasts.
//   predicted_yes = vote=YES ? confidence : vote=NO ? 1-confidence : 0.5
//   actual_yes    = resolution=YES ? 1.0 : 0.0
//   brier_call    = (predicted_yes - actual_yes)^2
// Lower Brier = better calibration. Perfect score is 0, random is 0.25.

import type { PublishedCall, AgentRole, AgentVote } from './calls-data'
import { getResolution } from './resolutions'

export const ALL_ROLES: AgentRole[] = [
  'MacroScout',
  'NewsHawk',
  'CrowdPulse',
  'BookWatcher',
  'Skeptic',
]

export type Category = 'sports' | 'crypto' | 'tech' | 'macro' | 'politics' | 'other'

export type CategoryStat = { resolved: number; won: number; brier: number }

export type AgentStats = {
  role: AgentRole
  callsTotal: number       // total calls this role voted on
  callsResolved: number    // calls with known YES/NO outcome
  callsPending: number     // calls still open
  callsWon: number         // resolved calls where this role's vote matched outcome
  winRate: number          // callsWon / callsResolved (0-1)
  brierScore: number       // 0-1, lower is better; 0 if no resolved calls
  avgConfidence: number    // mean of vote.confidence across all calls (0-1)
  agreementRate: number    // fraction of calls where role voted the council's side
  budgetMultiplier: number // reputation → budget: derived from brierScore (0.7..1.5)
  byCategory: Partial<Record<Category, CategoryStat>> // per-domain calibration
}

// Derive a market's category from its id (same buckets as the home feed).
export function categoryOf(marketId: string): Category {
  if (marketId.startsWith('wc-')) return 'sports'
  if (/btc|eth|sol|crypto/.test(marketId)) return 'crypto'
  if (/gpt|openai|apple/.test(marketId)) return 'tech'
  if (/fed|10y|cpi|rate/.test(marketId)) return 'macro'
  if (/trump|election|pardon/.test(marketId)) return 'politics'
  return 'other'
}

// THE ACCOUNTABILITY LOOP: an agent's Brier becomes its budget multiplier.
// Well-calibrated agents earn a bigger share of the bond; miscalibrated ones
// shrink. Unscored agents sit at neutral 1.0×.
export function budgetMultiplier(brierScore: number, callsResolved: number): number {
  // Thresholds tuned to real-match forecasting (favourites win ~70%): a Brier
  // near 0.20 is genuinely well-calibrated; ~0.27+ is worse than backing chalk.
  if (callsResolved === 0) return 1.0
  if (brierScore < 0.12) return 1.5   // sharp
  if (brierScore < 0.21) return 1.2   // calibrated
  if (brierScore < 0.27) return 1.0   // fair
  return 0.7                          // miscalibrated, staked smaller
}

function predictedYesProb(v: AgentVote): number {
  if (v.vote === 'YES') return v.confidence
  if (v.vote === 'NO') return 1 - v.confidence
  // ABSTAIN / NEUTRAL → no opinion → 0.5
  return 0.5
}

// For the Skeptic, the meaning of confidence is "refutation confidence",
// not direction. A high refutation confidence on an approved call means
// the Skeptic actually opposed it (and was overruled). We score the
// Skeptic by reading their vote literally, they still emit a YES/NO/ABSTAIN.

function votedOutcome(v: AgentVote, side: 'YES' | 'NO'): boolean {
  return v.vote === side
}

export function computeAgentStats(calls: PublishedCall[]): AgentStats[] {
  return ALL_ROLES.map((role) => {
    const myVotes: Array<{ vote: AgentVote; call: PublishedCall }> = []
    for (const call of calls) {
      const v = call.votes.find((vv) => vv.role === role)
      if (v) myVotes.push({ vote: v, call })
    }

    const callsTotal = myVotes.length
    let callsResolved = 0
    let callsPending = 0
    let callsWon = 0
    let brierSum = 0
    let confSum = 0
    let agreeCount = 0

    // Per-category accumulators.
    const catAcc: Partial<Record<Category, { resolved: number; won: number; brierSum: number }>> = {}

    for (const { vote, call } of myVotes) {
      confSum += vote.confidence
      if (vote.vote === call.side) agreeCount += 1

      const res = getResolution(call.marketId)
      if (res === 'PENDING') {
        callsPending += 1
        continue
      }
      callsResolved += 1
      const won = votedOutcome(vote, res)
      if (won) callsWon += 1

      const pYes = predictedYesProb(vote)
      const aYes = res === 'YES' ? 1 : 0
      const brierCall = (pYes - aYes) ** 2
      brierSum += brierCall

      const cat = categoryOf(call.marketId)
      const c = catAcc[cat] ?? { resolved: 0, won: 0, brierSum: 0 }
      c.resolved += 1; if (won) c.won += 1; c.brierSum += brierCall
      catAcc[cat] = c
    }

    const brierScore = callsResolved > 0 ? brierSum / callsResolved : 0
    const winRate = callsResolved > 0 ? callsWon / callsResolved : 0
    const avgConfidence = callsTotal > 0 ? confSum / callsTotal : 0
    const agreementRate = callsTotal > 0 ? agreeCount / callsTotal : 0

    const byCategory: Partial<Record<Category, CategoryStat>> = {}
    for (const [cat, c] of Object.entries(catAcc)) {
      byCategory[cat as Category] = { resolved: c.resolved, won: c.won, brier: c.brierSum / c.resolved }
    }

    return {
      role,
      callsTotal,
      callsResolved,
      callsPending,
      callsWon,
      winRate,
      brierScore,
      avgConfidence,
      agreementRate,
      budgetMultiplier: budgetMultiplier(brierScore, callsResolved),
      byCategory,
    }
  })
}

// THE LOOP, realized: the council's bond is scaled by how well the agreeing
// agents have actually been calibrated. Given the agents who voted the call's
// side, return the average of their budget multipliers (neutral 1.0 if no data).
export function councilTrustFromStats(stats: AgentStats[], agreeingRoles: AgentRole[]): number {
  const mults = agreeingRoles
    .map((r) => stats.find((s) => s.role === r)?.budgetMultiplier ?? 1.0)
  if (mults.length === 0) return 1.0
  return mults.reduce((s, x) => s + x, 0) / mults.length
}

// Server-side convenience: load the historical calls, compute stats, and
// return the council trust multiplier for a set of agreeing roles. Used by the
// orchestrator to size the bond. Falls back to 1.0 on any failure.
export function councilTrustForRoles(agreeingRoles: AgentRole[]): number {
  if (typeof window !== 'undefined') return 1.0
  try {
    // Lazy require so the client bundle isn't dragged into fs reads.
    const { loadCalls } = require('./calls-data.js') as typeof import('./calls-data.js')
    const stats = computeAgentStats(loadCalls())
    return councilTrustFromStats(stats, agreeingRoles)
  } catch {
    return 1.0
  }
}

// Rank: lowest Brier first; ties broken by win rate desc, then volume.
// Agents with no resolved calls go to the bottom (Brier=0 but unscored).
export function rankAgents(stats: AgentStats[]): AgentStats[] {
  return [...stats].sort((a, b) => {
    const aScored = a.callsResolved > 0
    const bScored = b.callsResolved > 0
    if (aScored !== bScored) return aScored ? -1 : 1
    if (a.brierScore !== b.brierScore) return a.brierScore - b.brierScore
    if (a.winRate !== b.winRate) return b.winRate - a.winRate
    return b.callsTotal - a.callsTotal
  })
}

// Overall council Brier = mean across roles that have resolved calls.
export function councilBrier(stats: AgentStats[]): number {
  const scored = stats.filter((s) => s.callsResolved > 0)
  if (scored.length === 0) return 0
  return scored.reduce((s, x) => s + x.brierScore, 0) / scored.length
}
