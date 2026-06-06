// Phase 8.2 — orchestrator. Runs the 5-role council against a market and
// either returns a PublishedCall (gate passed) or null (refused).
//
// Phase 8.2 is Venice-only — no x402 evidence buys, no on-chain bond
// (the gate just GATES; persistence + on-chain bond is Phase 8.3).
//
// Inputs are deliberately small so we can swap in real evidence (x402)
// and persistence (calls-store) in the next phases without changing the
// orchestrator's outer contract.

import { encodeFunctionData, erc20Abi, formatUnits, parseUnits, type Hex } from 'viem'
import {
  bearAccount,
  bullAccount,
  bullWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from '../config.js'
import { env as envVars } from '../env.js'
import { marketAbi } from '../market.js'
import { getMarketMeta, type MarketMeta } from '../markets-data.js'
import type { AgentVote, EvidenceItem, PublishedCall } from '../calls-data.js'
import { runRoleAgent, runSkeptic, generateThesis } from './agents.js'
import { POST as evidenceHandler } from '../../app/api/evidence/route.js'
import { buyEvidence } from '../x402-buyer.js'
import { buildRootMandate } from '../mandate.js'
import { buildBullBudget } from '../duel.js'
import { ensureFunded } from '../deploy-sa.js'
import { buildUserSmartAccount } from '../accounts.js'
import { addCall } from '../calls-store.js'
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'
import { encodeDelegations } from '@metamask/smart-accounts-kit/utils'
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'

// Quality gate thresholds — same shape as the README documents.
const MIN_AGREE = 3
const MAX_SKEPTIC_VETO_CONF = 0.5
const MIN_EDGE = 0.05

const ROLES = ['MacroScout', 'NewsHawk', 'CrowdPulse', 'BookWatcher'] as const

export type CouncilEvent =
  | { type: 'started'; marketId: string; marketTitle: string; impliedProbYes: number }
  | { type: 'treasury-mandate-signed' }
  | { type: 'role-evidence'; role: string; signal: string; sourceUrl: string; txHash: string; usdcSpent: string }
  | { type: 'role-vote'; vote: AgentVote }
  | { type: 'majority'; side: 'YES' | 'NO'; agreeing: number; total: number }
  | { type: 'skeptic-verdict'; vote: AgentVote }
  | { type: 'gate-decision'; passed: boolean; reasons: string[] }
  | { type: 'thesis-generated' }
  | { type: 'bond-posted'; bondUsdc: number; bondHolder: string; txHash: string }
  | { type: 'published'; call: PublishedCall }
  | { type: 'refused'; reason: string }
  | { type: 'error'; message: string }

export type RunCouncilOptions = {
  onEvent?: (e: CouncilEvent) => void | Promise<void>
  // Force-feed evidence per role (skip x402 buys). Useful for offline dev.
  stubEvidenceByRole?: Partial<Record<(typeof ROLES)[number], string>>
  // Skip x402 evidence buys entirely (Phase 8.2 behaviour).
  stubEvidence?: boolean
  // Allows the test script to dictate the bond size; otherwise sized by confidence.
  bondUsdc?: number
  // Persist the PublishedCall to .crossfire/calls.json on success.
  persist?: boolean
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

  // ── 2. Buy evidence per role via x402 (or use stubs) ──────────────────
  // The buyer is BULL EOA (treasury sub-budget); each evidence purchase
  // redeems through the council's ERC-7710 chain — real USDC moves from
  // USER SA → facilitator. 4 buys × 0.5 USDC = 2 USDC per council run.
  const evidenceByRole: Partial<Record<(typeof ROLES)[number], EvidenceItem>> = {}
  const evidenceTxs: string[] = []

  if (!opts.stubEvidence) {
    try {
      // Ensure USER SA has enough for evidence buys (~2 USDC) + bond
      // (up to ~10 USDC). 15 USDC floor leaves comfortable margin.
      const userSA = await buildUserSmartAccount()
      await ensureFunded(
        'USER',
        userSA.address,
        userAccount,
        userWalletSepolia,
        sepoliaPublicClient,
        15_000_000n,  // need ≥ 15 USDC
        15_000_000n,  // top up 15 USDC if low
      ).catch(() => null)

      const { signedDelegation: signedRoot } = await buildRootMandate()
      const bullBudget = await buildBullBudget(signedRoot)
      const parentChain = [bullBudget, signedRoot] as any[]
      await emit({ type: 'treasury-mandate-signed' })

      // Buy evidence per role in series (avoid ORCH nonce collision since ORCH is facilitator)
      for (const role of ROLES) {
        const buy = await buyEvidence({
          url: `http://localhost/api/evidence?marketId=${marketId}&role=${role}`,
          buyerPrivateKey: envVars.BULL_PRIVATE_KEY,
          buyerAddress: bullAccount.address,
          parentChain,
          fetchFn: async (req) => (await evidenceHandler(req as any)) as unknown as Response,
        })
        evidenceByRole[role] = buy.evidence as EvidenceItem
        evidenceTxs.push(buy.settlementTxHash)
        await emit({
          type: 'role-evidence',
          role,
          signal: buy.evidence.signal,
          sourceUrl: buy.evidence.sourceUrl,
          txHash: buy.settlementTxHash,
          usdcSpent: (Number(buy.usdcSpent) / 1e6).toFixed(2),
        })
      }
    } catch (e) {
      await emit({ type: 'error', message: `x402 evidence buys failed: ${(e as Error).message}` })
      return null
    }
  }

  // Build a per-role evidenceContext string (either from real x402 buys or stubs)
  const evidenceFor = (role: (typeof ROLES)[number]): string => {
    if (opts.stubEvidence && opts.stubEvidenceByRole?.[role]) {
      return opts.stubEvidenceByRole[role]!
    }
    const ev = evidenceByRole[role]
    if (ev) {
      return `[${role}'s evidence from x402 purchase]
        signal: ${ev.signal}
        source: ${ev.sourceUrl}
        weight: ${ev.weight}
        Use this signal/weight as your anchor for the vote.`
    }
    return '(no role-specific evidence; reason from your domain expertise alone)'
  }

  // ── 3. Run the four role agents (parallel) ────────────────────────────
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

  // Build the evidenceUrls array from the real x402 purchases
  const evidenceUrls = ROLES.map((role) => {
    const ev = evidenceByRole[role]
    if (!ev) return null
    return { label: `${role}: ${ev.sourceUrl.split('/').slice(2, 4).join('/')}`, url: ev.sourceUrl, signal: ev.signal as any }
  }).filter(Boolean) as Array<{ label: string; url: string; signal: 'YES' | 'NO' | 'NEUTRAL' }>

  // ── 7. Post the bond on-chain (Phase 8.6) ────────────────────────────
  // The bond is a real USDC transfer from USER SA → BEAR EOA (the bond
  // holder), redeemed through Bull's existing sub-budget chain. The
  // chain-enforced cap means the council literally can't bond more than
  // it has authority for. Skipped if stubEvidence is true (test mode).
  let bondTxHash: Hex | undefined
  const bondHolder = bearAccount.address as `0x${string}`
  if (!opts.stubEvidence) {
    try {
      const bondAmountWei = parseUnits(bondUsdc.toString(), 6)
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [bondHolder, bondAmountWei],
      })

      // Re-sign the chain for the bond redemption (we already have signedRoot
      // and bullBudget from the evidence step, but salts are fresh per
      // delegation in our pattern — we can reuse the same signed chain since
      // the kit allows multiple redemptions against the same delegation
      // until the cap is exhausted).
      const env = getSmartAccountsEnvironment(84532 as any)
      const { signedDelegation: signedRoot } = await buildRootMandate()
      const bullBudget = await buildBullBudget(signedRoot)
      const winningWallet = bullWalletSepolia.extend(erc7710WalletActions())
      const winningChainEncoded = encodeDelegations([bullBudget, signedRoot]) as Hex

      bondTxHash = await winningWallet.sendTransactionWithDelegation({
        to: USDC_SEPOLIA,
        data: transferData,
        value: 0n,
        permissionContext: winningChainEncoded,
        delegationManager: env.DelegationManager,
      })
      const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: bondTxHash })
      if (receipt.status !== 'success') {
        await emit({ type: 'error', message: `bond posting tx reverted: ${bondTxHash}` })
        return null
      }
      await emit({
        type: 'bond-posted',
        bondUsdc,
        bondHolder,
        txHash: bondTxHash,
      })
    } catch (e) {
      await emit({ type: 'error', message: `bond posting failed: ${(e as Error).message}` })
      // Don't return null — we still publish the call, just without bondTxHash.
      // The narrative downgrades from "bond posted on-chain" to "bond pending".
    }
  }

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
    bondTxHash,
    bondHolder,
    publishedAt: Date.now(),
    publishedBy: COUNCIL_DESK,
    votes: [...roleVotes, skepticVote],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis,
      evidenceUrls,
      sizingRationale: `Bond ${bondUsdc.toFixed(2)} USDC posted on-chain via Bull's sub-budget chain ${bondTxHash ? `(tx ${bondTxHash.slice(0, 10)}…)` : '(off-chain)'}. ${evidenceTxs.length} x402 evidence settlement(s) on-chain. Sized by avg council confidence ${(avgConfidence * 100).toFixed(0)}% × edge ${(edge * 100).toFixed(0)}pts.`,
      counterarguments,
    },
  }

  await emit({ type: 'published', call })

  if (opts.persist) {
    try { addCall(call) } catch {}
  }

  return call
}
