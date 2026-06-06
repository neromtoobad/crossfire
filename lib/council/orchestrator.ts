// Phase 8.2 — orchestrator. Runs the 5-role council against a market and
// either returns a PublishedCall (gate passed) or null (refused).
//
// Phase 8.2 is Venice-only — no x402 evidence buys, no on-chain bond
// (the gate just GATES; persistence + on-chain bond is Phase 8.3).
//
// Inputs are deliberately small so we can swap in real evidence (x402)
// and persistence (calls-store) in the next phases without changing the
// orchestrator's outer contract.

import { erc20Abi, formatUnits } from 'viem'
import { sepoliaPublicClient, USDC_SEPOLIA } from '../config.js'
import { marketAbi } from '../market.js'
import { getMarketMeta, type MarketMeta } from '../markets-data.js'
import type { AgentVote, PublishedCall } from '../calls-data.js'
import { runRoleAgent, runSkeptic, generateThesis } from './agents.js'

// Quality gate thresholds — same shape as the README documents.
const MIN_AGREE = 3
const MAX_SKEPTIC_VETO_CONF = 0.5
const MIN_EDGE = 0.05

const ROLES = ['MacroScout', 'NewsHawk', 'CrowdPulse', 'BookWatcher'] as const

export type CouncilEvent =
  | { type: 'started'; marketId: string; marketTitle: string; impliedProbYes: number }
  | { type: 'role-vote'; vote: AgentVote }
  | { type: 'majority'; side: 'YES' | 'NO'; agreeing: number; total: number }
  | { type: 'skeptic-verdict'; vote: AgentVote }
  | { type: 'gate-decision'; passed: boolean; reasons: string[] }
  | { type: 'thesis-generated' }
  | { type: 'published'; call: PublishedCall }
  | { type: 'refused'; reason: string }
  | { type: 'error'; message: string }

export type RunCouncilOptions = {
  onEvent?: (e: CouncilEvent) => void | Promise<void>
  // Stub evidence per role — Phase 8.3 will fan out real x402 buys.
  evidenceByRole?: Partial<Record<(typeof ROLES)[number], string>>
  // Allows the test script to dictate the bond size; otherwise sized by confidence.
  bondUsdc?: number
}

// Council treasury identity. For Phase 8.2 it's just a hardcoded handle.
const COUNCIL_DESK = 'Council-A'

// Bond sizing: scale with confidence + edge.
function suggestBondUsdc(confidence: number, edge: number): number {
  const base = 2
  const conviction = (confidence - 0.5) * 2 // 0..1
  const edgePts = Math.abs(edge)
  const scaled = base + conviction * 4 + edgePts * 10
  return Math.round(Math.min(10, Math.max(2, scaled)) * 100) / 100
}

export async function runCouncil(
  marketId: string,
  opts: RunCouncilOptions = {},
): Promise<PublishedCall | null> {
  const emit = async (e: CouncilEvent) => { await opts.onEvent?.(e) }

  // ── 1. Resolve the market ─────────────────────────────────────────────
  const meta = getMarketMeta(marketId)
  if (!meta) {
    await emit({ type: 'error', message: `unknown market: ${marketId}` })
    return null
  }

  let impliedProbYes = 0.5
  try {
    const impl = await sepoliaPublicClient.readContract({
      address: meta.address,
      abi: marketAbi,
      functionName: 'impliedProbYes',
    }) as bigint
    impliedProbYes = Number(impl) / 1e18
  } catch {/* fall through to 0.5 default */}

  await emit({
    type: 'started',
    marketId,
    marketTitle: meta.title,
    impliedProbYes,
  })

  // ── 2. Run the four role agents (parallel) ────────────────────────────
  const evidenceFor = (role: (typeof ROLES)[number]): string =>
    opts.evidenceByRole?.[role] ?? '(no role-specific evidence; reason from your domain expertise alone)'

  let roleVotes: AgentVote[]
  try {
    roleVotes = await Promise.all(
      ROLES.map((role) =>
        runRoleAgent({
          role,
          marketTitle: meta.title,
          impliedProbYes,
          evidenceContext: evidenceFor(role),
        }),
      ),
    )
  } catch (e) {
    await emit({ type: 'error', message: `role agent failed: ${(e as Error).message}` })
    return null
  }

  for (const v of roleVotes) await emit({ type: 'role-vote', vote: v })

  // ── 3. Determine majority side (among non-NEUTRAL non-Skeptic votes) ─
  const yesCount = roleVotes.filter((v) => v.vote === 'YES').length
  const noCount = roleVotes.filter((v) => v.vote === 'NO').length
  if (yesCount === 0 && noCount === 0) {
    await emit({ type: 'refused', reason: 'every role voted NEUTRAL — no signal' })
    return null
  }
  const majoritySide: 'YES' | 'NO' = yesCount > noCount ? 'YES' : 'NO'
  const agreeing = majoritySide === 'YES' ? yesCount : noCount
  await emit({
    type: 'majority',
    side: majoritySide,
    agreeing,
    total: ROLES.length,
  })

  // ── 4. Skeptic reviews the four votes ─────────────────────────────────
  let skepticVote: AgentVote
  try {
    skepticVote = await runSkeptic({
      marketTitle: meta.title,
      impliedProbYes,
      majoritySide,
      otherVotes: roleVotes,
    })
  } catch (e) {
    await emit({ type: 'error', message: `skeptic failed: ${(e as Error).message}` })
    return null
  }
  await emit({ type: 'skeptic-verdict', vote: skepticVote })

  // ── 5. Quality gate ───────────────────────────────────────────────────
  const reasons: string[] = []
  const skepticVetoed = skepticVote.confidence >= MAX_SKEPTIC_VETO_CONF
  if (agreeing < MIN_AGREE) reasons.push(`only ${agreeing}/${ROLES.length} agreed (need ${MIN_AGREE})`)
  if (skepticVetoed) reasons.push(`Skeptic vetoed (confidence ${(skepticVote.confidence * 100).toFixed(0)}%)`)

  const agreeingVotes = roleVotes.filter((v) => v.vote === majoritySide)
  const avgConfidence = agreeingVotes.reduce((s, v) => s + v.confidence, 0) / Math.max(1, agreeingVotes.length)
  const selectedSideProb = avgConfidence
  // Edge in terms of the SELECTED side's probability minus market-implied
  const marketSelectedProb = majoritySide === 'YES' ? impliedProbYes : 1 - impliedProbYes
  const edge = selectedSideProb - marketSelectedProb
  if (edge < MIN_EDGE) reasons.push(`edge ${(edge * 100).toFixed(1)}pts < ${(MIN_EDGE * 100).toFixed(0)}pts`)

  const passed = reasons.length === 0
  await emit({ type: 'gate-decision', passed, reasons })
  if (!passed) {
    await emit({ type: 'refused', reason: reasons.join(' · ') })
    return null
  }

  // ── 6. Generate full thesis (gate passed) ────────────────────────────
  let thesis = ''
  let counterarguments = ''
  try {
    const out = await generateThesis({
      marketTitle: meta.title,
      side: majoritySide,
      impliedProbYes,
      selectedSideProb,
      votes: roleVotes,
      skeptic: skepticVote,
    })
    thesis = out.thesis
    counterarguments = out.counterarguments
    await emit({ type: 'thesis-generated' })
  } catch (e) {
    await emit({ type: 'error', message: `thesis generation failed: ${(e as Error).message}` })
    return null
  }

  // ── 7. Build the PublishedCall ───────────────────────────────────────
  const bondUsdc = opts.bondUsdc ?? suggestBondUsdc(avgConfidence, edge)
  const id = `call-${marketId}-${Date.now().toString(36)}`

  const call: PublishedCall = {
    id,
    marketId,
    marketTitle: meta.title,
    marketAddress: meta.address as `0x${string}`,
    side: majoritySide,
    selectedSideProb,
    marketImpliedYes: impliedProbYes,
    edge,
    bondUsdc,
    unlockUsdc: 0.10,
    publishedAt: Date.now(),
    publishedBy: COUNCIL_DESK,
    votes: [...roleVotes, skepticVote],
    skepticVerdict: 'APPROVED',  // gate passed = approved
    locked: {
      thesis,
      evidenceUrls: [],  // Phase 8.3 fills these from x402 buys
      sizingRationale: `Bond ${bondUsdc.toFixed(2)} USDC — sized by average council confidence ${(avgConfidence * 100).toFixed(0)}% × edge ${(edge * 100).toFixed(0)}pts. (Phase 8.3 will adjust by treasury policy.)`,
      counterarguments,
    },
  }

  await emit({ type: 'published', call })
  return call
}
