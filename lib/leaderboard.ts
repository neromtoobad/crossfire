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
// Skeptic by reading their vote literally — they still emit a YES/NO/ABSTAIN.

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

    for (const { vote, call } of myVotes) {
      confSum += vote.confidence
      if (vote.vote === call.side) agreeCount += 1

      const res = getResolution(call.marketId)
      if (res === 'PENDING') {
        callsPending += 1
        continue
      }
      callsResolved += 1
      if (votedOutcome(vote, res)) callsWon += 1

      const pYes = predictedYesProb(vote)
      const aYes = res === 'YES' ? 1 : 0
      brierSum += (pYes - aYes) ** 2
    }

    const brierScore = callsResolved > 0 ? brierSum / callsResolved : 0
    const winRate = callsResolved > 0 ? callsWon / callsResolved : 0
    const avgConfidence = callsTotal > 0 ? confSum / callsTotal : 0
    const agreementRate = callsTotal > 0 ? agreeCount / callsTotal : 0

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
    }
  })
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
