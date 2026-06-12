// Phase 9.2, "scout" the watch list.
//
// Run the full live debate on an arbitrary Polymarket market (not one of our
// on-chain BinaryMarkets) and produce a verdict + the council's edge vs the
// live Polymarket price. No on-chain bond, bonding 1,889 markets would be
// absurd; this is the council scanning the universe for mispricings.

import type { AgentVote } from '../calls-data.js'
import { runDebate, type DebateEvent } from './debate.js'

// Same gate thresholds the published-call orchestrator uses.
const MIN_AGREE = 3
const MAX_SKEPTIC_VETO_CONF = 0.5
const MIN_EDGE = 0.05

export type ScoutEvent =
  | { type: 'scout-started'; question: string; impliedProbYes: number; slug?: string }
  | DebateEvent
  | {
      type: 'scout-verdict'
      side: 'YES' | 'NO'
      confidence: number      // council P(side)
      polymarketYes: number   // live Polymarket P(YES)
      edgePts: number         // signed: council P(side) − market P(side), in points
      agreeing: number
      skepticVetoed: boolean
      passed: boolean
      reasons: string[]
      oneLiner: string
    }
  | { type: 'error'; message: string }

type Emit = (e: ScoutEvent) => void | Promise<void>

export async function runScout({
  question,
  impliedProbYes,
  slug,
  emit,
}: {
  question: string
  impliedProbYes: number
  slug?: string
  emit: Emit
}): Promise<void> {
  await emit({ type: 'scout-started', question, impliedProbYes, slug })

  // Watch markets have no x402 evidence keyed to them, the agents reason
  // from their domain expertise + the live Polymarket price they're given.
  const evidenceFor = () => ''

  let roleVotes: AgentVote[]
  let skepticVote: AgentVote
  try {
    const out = await runDebate({
      marketTitle: question,
      impliedProbYes,
      evidenceFor,
      emit: (e) => emit(e),
    })
    roleVotes = out.roleVotes
    skepticVote = out.skepticVote
  } catch (e) {
    await emit({ type: 'error', message: `debate failed: ${(e as Error).message}` })
    return
  }

  const yes = roleVotes.filter((v) => v.vote === 'YES').length
  const no = roleVotes.filter((v) => v.vote === 'NO').length
  if (yes === 0 && no === 0) {
    await emit({
      type: 'scout-verdict',
      side: impliedProbYes >= 0.5 ? 'YES' : 'NO',
      confidence: 0.5, polymarketYes: impliedProbYes, edgePts: 0,
      agreeing: 0, skepticVetoed: false, passed: false,
      reasons: ['every agent abstained, no signal'],
      oneLiner: 'The desk found no edge here.',
    })
    return
  }

  const side: 'YES' | 'NO' = yes > no ? 'YES' : 'NO'
  const agreeing = side === 'YES' ? yes : no
  const agreeingVotes = roleVotes.filter((v) => v.vote === side)
  const confidence = agreeingVotes.reduce((s, v) => s + v.confidence, 0) / Math.max(1, agreeingVotes.length)

  const marketSideProb = side === 'YES' ? impliedProbYes : 1 - impliedProbYes
  const edge = confidence - marketSideProb
  const edgePts = Math.round(edge * 100)

  const skepticVetoed = skepticVote.confidence >= MAX_SKEPTIC_VETO_CONF
  const reasons: string[] = []
  if (agreeing < MIN_AGREE) reasons.push(`only ${agreeing}/4 agreed (need ${MIN_AGREE})`)
  if (skepticVetoed) reasons.push(`Skeptic vetoed (${(skepticVote.confidence * 100).toFixed(0)}% refute)`)
  if (edge < MIN_EDGE) reasons.push(`edge ${edgePts}pts < ${(MIN_EDGE * 100).toFixed(0)}pts`)
  const passed = reasons.length === 0

  const oneLiner = passed
    ? `The council backs ${side} at ${(confidence * 100).toFixed(0)}%, ${edgePts > 0 ? '+' : ''}${edgePts}pts vs Polymarket.`
    : `The council leans ${side} but won't commit: ${reasons.join(' · ')}.`

  await emit({
    type: 'scout-verdict',
    side, confidence, polymarketYes: impliedProbYes, edgePts,
    agreeing, skepticVetoed, passed, reasons, oneLiner,
  })
}
