// Phase 4 — Prompt 4.2. The mechanism.
//
// Adversarial conviction → metered on-chain → net position.
//
// Per side (Bull / Bear, run in parallel):
//   1. Loop: buy evidence (drawing the sub-cap down) → Venice conviction
//      Exit when |edge| is sufficient OR sub-cap is exhausted.
//   2. Record final stakeUsdc and rationale.
//
// Then:
//   net = bullStake − bearStake
//   |net| < dust → ABSTAIN (place nothing, surface "market genuinely uncertain")
//   else        → bet sized |net| through the WINNING side's chain
//
// The bet itself is two on-chain steps:
//   (a) USDC.transfer(market, |net|)   — through winning sub's redelegation
//                                        chain, allowed by Erc20TransferAmount.
//   (b) market.buyOnBehalf(USER SA, isYes, |net|)
//                                      — permissionless credit call from any
//                                        EOA; here ORCH does the courtesy.

import { POST as evidenceHandler } from '../app/api/evidence/route.js'
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  type Hex,
} from 'viem'
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'
import { encodeDelegations } from '@metamask/smart-accounts-kit/utils'
import { buildUserSmartAccount } from './accounts.js'
import {
  bearAccount,
  bearWalletSepolia,
  bullAccount,
  bullWalletSepolia,
  orchestratorAccount,
  orchestratorWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
} from './config.js'
import { ensureDeployed, ensureFunded } from './deploy-sa.js'
import {
  BEAR_CAP_USDC,
  BULL_CAP_USDC,
  buildBearBudget,
  buildBullBudget,
} from './duel.js'
import { env as envVars } from './env.js'
import { conviction, type Conviction } from './venice.js'
import { getMarket, marketAbi, readImpliedProbYes, readPosition, readTotals } from './market.js'
import { buildRootMandate } from './mandate.js'
import { buyEvidence } from './x402-buyer.js'

const EVIDENCE_PRICE_USDC = 500_000n // 0.5 USDC, must match seller's PAYMENT-REQUIRED
const DUST_USDC = 1_000_000n          // 1 USDC — if net is below this the system honestly abstains
const STAKE_BELOW_THRESHOLD = 0       // model returns 0 if |edge|<0.05

type SideResult = {
  conviction: Conviction
  evidenceTxHashes: Hex[]
  evidenceSpent: bigint  // total USDC spent on evidence this round
  remainingCap: bigint   // sub-cap minus evidence spend
}

export type DuelOutcome = {
  bullStake: number
  bearStake: number
  netUsdc: number
  side: 'YES' | 'NO' | 'ABSTAIN'
  betTransferTx?: Hex
  buyOnBehalfTx?: Hex
  abstained: boolean
  bullRationale: string
  bearRationale: string
  evidenceTxHashes: { bull: Hex[]; bear: Hex[] }
  marketAfter: { totalYes: bigint; totalNo: bigint; userSaPosition: { yes: bigint; no: bigint }; impliedProb: number }
}

type RunOptions = {
  bullEvidenceCalls?: number      // evidence buys for Bull (default 1)
  bearEvidenceCalls?: number      // evidence buys for Bear (default 1)
  abstainOverride?: boolean       // when true, force both stakes equal to demo ABSTAIN path
}

/** Run a single side's evidence loop + Venice conviction. */
async function runSide({
  side,
  buyerPrivateKey,
  buyerAddress,
  subCap,
  parentChain,
  impliedProb,
  evidenceCallsPerSide,
}: {
  side: 'YES' | 'NO'
  buyerPrivateKey: Hex
  buyerAddress: `0x${string}`
  subCap: bigint
  parentChain: any[]
  impliedProb: number
  evidenceCallsPerSide: number
}): Promise<SideResult> {
  const evidenceTxHashes: Hex[] = []
  let evidenceSpent = 0n
  const evidence: any[] = []

  for (let i = 0; i < evidenceCallsPerSide; i++) {
    if (evidenceSpent + EVIDENCE_PRICE_USDC > subCap) break // can't afford another buy
    const buy = await buyEvidence({
      url: `http://localhost/api/evidence?marketId=phase4-demo-market&side=${side}`,
      buyerPrivateKey,
      buyerAddress,
      parentChain,
      fetchFn: async (req) => (await evidenceHandler(req as any)) as unknown as Response,
    })
    evidenceTxHashes.push(buy.settlementTxHash)
    evidenceSpent += buy.usdcSpent
    evidence.push(buy.evidence)
  }

  const remainingCap = subCap - evidenceSpent
  const remainingCapNum = Number(formatUnits(remainingCap, 6))

  const c = await conviction({
    side,
    evidence,
    remainingCapUsdc: remainingCapNum,
    impliedProb,
    marketQuestion: 'Will CROSSFIRE ship its working demo on time?',
  })

  return { conviction: c, evidenceTxHashes, evidenceSpent, remainingCap }
}

export async function runDuel(opts: RunOptions = {}): Promise<DuelOutcome> {
  const bullEvidenceCalls = opts.bullEvidenceCalls ?? 1
  const bearEvidenceCalls = opts.bearEvidenceCalls ?? 1

  // ── Prep ─────────────────────────────────────────────────────────────────
  const userSA = await buildUserSmartAccount()
  // USER SA needs enough USDC for: evidence (≤3 × 0.5 = 1.5) + bet (≤20).
  // Top up from ORCH EOA which has been accumulating USDC via x402 settlements.
  await ensureFunded(
    'USER',
    userSA.address,
    orchestratorAccount,
    orchestratorWalletSepolia,
    sepoliaPublicClient,
    parseUnits('22', 6),
    parseUnits('10', 6),
  ).catch((e) => {
    console.warn(`  ⚠ ensureFunded soft-fail: ${(e as Error).message}`)
  })

  const { signedDelegation: signedRoot } = await buildRootMandate()
  const [bullBudget, bearBudget] = await Promise.all([
    buildBullBudget(signedRoot),
    buildBearBudget(signedRoot),
  ])

  const impliedProb = await readImpliedProbYes()
  console.log(`  market implied P(YES) = ${impliedProb.toFixed(3)}`)

  // ── Sides run "in parallel" CONCEPTUALLY (independent reasoners), but
  //    we serialize on-chain because both evidence settlements use the same
  //    ORCH EOA as facilitator. Running them concurrently grabs the same
  //    nonce twice → "replacement transaction underpriced". Sequential
  //    keeps semantics identical and avoids the nonce collision.
  const bull = await runSide({
    side: 'YES',
    buyerPrivateKey: envVars.BULL_PRIVATE_KEY,
    buyerAddress: bullAccount.address,
    subCap: BULL_CAP_USDC,
    parentChain: [bullBudget, signedRoot],
    impliedProb,
    evidenceCallsPerSide: bullEvidenceCalls,
  })
  console.log(`  Bull conviction: ${bull.conviction.side} stake=${bull.conviction.stakeUsdc.toFixed(2)} edge=${bull.conviction.edge.toFixed(3)}`)

  const bear = await runSide({
    side: 'NO',
    buyerPrivateKey: envVars.BEAR_PRIVATE_KEY,
    buyerAddress: bearAccount.address,
    subCap: BEAR_CAP_USDC,
    parentChain: [bearBudget, signedRoot],
    impliedProb,
    evidenceCallsPerSide: bearEvidenceCalls,
  })
  console.log(`  Bear conviction: ${bear.conviction.side} stake=${bear.conviction.stakeUsdc.toFixed(2)} edge=${bear.conviction.edge.toFixed(3)}`)

  // ── Net + decide ─────────────────────────────────────────────────────────
  let bullStake = bull.conviction.stakeUsdc
  let bearStake = bear.conviction.stakeUsdc
  if (opts.abstainOverride) {
    // Force a tie so we can demonstrate the abstain path
    const tie = Math.min(bullStake, bearStake, 1)
    bullStake = tie
    bearStake = tie
  }
  const netUsdcFloat = bullStake - bearStake
  const netUsdcWei = parseUnits(Math.abs(netUsdcFloat).toFixed(6), 6)

  const marketAddress = getMarket()
  const isYes = netUsdcFloat > 0

  // Default to abstain shape; mutate if we end up betting
  const outcome: DuelOutcome = {
    bullStake,
    bearStake,
    netUsdc: netUsdcFloat,
    side: 'ABSTAIN',
    abstained: true,
    bullRationale: bull.conviction.rationale,
    bearRationale: bear.conviction.rationale,
    evidenceTxHashes: { bull: bull.evidenceTxHashes, bear: bear.evidenceTxHashes },
    marketAfter: { totalYes: 0n, totalNo: 0n, userSaPosition: { yes: 0n, no: 0n }, impliedProb: 0 },
  }

  if (netUsdcWei < DUST_USDC) {
    // ABSTAIN — no on-chain bet, just read market state for the summary
    const totals = await readTotals()
    const userPos = await readPosition(userSA.address)
    const impl = await readImpliedProbYes()
    outcome.marketAfter = { ...totals, userSaPosition: userPos, impliedProb: impl }
    return outcome
  }

  // ── Place the bet through the WINNING side's chain ───────────────────────
  // (a) USDC.transfer(market, |net|) via winning sub's chain
  const winningWallet = (isYes ? bullWalletSepolia : bearWalletSepolia).extend(
    erc7710WalletActions(),
  )
  const winningChain = isYes ? [bullBudget, signedRoot] : [bearBudget, signedRoot]
  const winningChainEncoded = encodeDelegations(winningChain) as Hex
  const transferCalldata = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [marketAddress, netUsdcWei],
  })

  const delegationManager = (await buildUserSmartAccount()).environment.DelegationManager

  // Read market USDC balance BEFORE transfer so we know the real delta after.
  const marketBalBefore = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [marketAddress],
  })

  const transferHash = await winningWallet.sendTransactionWithDelegation({
    to: USDC_SEPOLIA,
    data: transferCalldata,
    value: 0n,
    permissionContext: winningChainEncoded,
    delegationManager,
  })
  const transferReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: transferHash })
  if (transferReceipt.status !== 'success') {
    throw new Error(`Bet transfer reverted on-chain: ${transferHash}`)
  }

  // Read what actually landed in the market — use this as the credit amount
  // so any "ghost" pre-existing balance can't mis-credit the bet. Public RPCs
  // can return stale state right after a receipt, so retry until we see the
  // delta (or 8 × 1.5s timeout).
  let marketBalAfter = marketBalBefore
  for (let i = 0; i < 8; i++) {
    marketBalAfter = await sepoliaPublicClient.readContract({
      address: USDC_SEPOLIA,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [marketAddress],
    })
    if (marketBalAfter > marketBalBefore) break
    await new Promise((r) => setTimeout(r, 1500))
  }
  const claimAmount = marketBalAfter - marketBalBefore
  if (claimAmount === 0n) {
    throw new Error(`Transfer mined but market balance unchanged after 8 retries: ${transferHash}`)
  }

  // (b) ORCH calls market.buyOnBehalf(USER_SA, isYes, claimAmount) — uses
  //     the OBSERVED delta, not the requested net, so we credit exactly what
  //     landed even if RPC routing or earlier ghost deposits muddied things.
  const buyHash = await orchestratorWalletSepolia.writeContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: 'buyOnBehalf',
    args: [userSA.address, isYes, claimAmount],
  })
  const buyReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: buyHash })
  if (buyReceipt.status !== 'success') {
    throw new Error(`buyOnBehalf reverted on-chain: ${buyHash}`)
  }

  // Public RPC nodes can serve stale state right after a receipt — retry
  // until the credited shares appear in the position read.
  let userPos = await readPosition(userSA.address)
  for (let i = 0; i < 6; i++) {
    const credited = isYes ? userPos.yes : userPos.no
    if (credited >= netUsdcWei) break
    await new Promise((r) => setTimeout(r, 1500))
    userPos = await readPosition(userSA.address)
  }
  const totals = await readTotals()
  const impl = await readImpliedProbYes()

  outcome.side = isYes ? 'YES' : 'NO'
  outcome.abstained = false
  outcome.betTransferTx = transferHash
  outcome.buyOnBehalfTx = buyHash
  outcome.marketAfter = { ...totals, userSaPosition: userPos, impliedProb: impl }

  return outcome
}
