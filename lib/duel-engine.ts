// Phase 7.5 — server-side duel engine driven by a user-signed mandate.
//
// Where lib/resolve.ts uses env-key USER (a smart account we control), this
// module accepts a user's wallet-signed root delegation and runs the same
// adversarial duel against it. Used by /api/duel/run.
//
// Flow:
//   1. Take signed root mandate (user EOA → ORCH service)
//   2. Server-side, redelegate root to Bull and Bear (each capped)
//   3. For each side in series (avoid ORCH-EOA nonce collision):
//        a. x402 evidence buy (real USDC drawn from user via chain)
//        b. Venice conviction with the bought evidence
//   4. net = bullStake − bearStake
//   5. If |net| < dust → ABSTAIN. Else:
//        a. USDC.transfer(market, |net|) via winning sub's chain
//        b. market.buyOnBehalf(user EOA, isYes, claimAmount) credits user
//   6. Emit progress at every step via onEvent(...)

import { POST as evidenceHandler } from '../app/api/evidence/route.js'
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  type Hex,
  type WalletClient,
} from 'viem'
import {
  createDelegation,
  ScopeType,
  signDelegation,
  getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'
import { encodeDelegations, generateSalt } from '@metamask/smart-accounts-kit/utils'
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
import { env as envVars } from './env.js'
import { marketAbi } from './market.js'
import { conviction, type Conviction } from './venice.js'
import { buyEvidence } from './x402-buyer.js'
import { PUBLIC } from './public-config.js'

const SEPOLIA_CHAIN_ID = 84532
const EVIDENCE_PRICE_USDC = 500_000n   // 0.5 USDC per evidence call
const DUST_USDC = 1_000_000n           // 1 USDC

// ── Public event shapes the UI consumes ──────────────────────────────────
export type DuelEvent =
  | { type: 'started'; user: string; marketId: string; capUsdc: number }
  | { type: 'sub-budgets-signed'; bullCapUsdc: number; bearCapUsdc: number }
  | { type: 'side-evidence'; side: 'BULL' | 'BEAR'; n: number; signal: string; sourceUrl: string; txHash: string; usdcSpent: string }
  | { type: 'side-conviction'; side: 'BULL' | 'BEAR'; conviction: Conviction }
  | { type: 'netting'; bullStake: number; bearStake: number; netUsdc: number }
  | { type: 'abstain'; netUsdc: number; reason: string }
  | { type: 'bet-transfer'; side: 'YES' | 'NO'; amountUsdc: number; txHash: string }
  | { type: 'bet-credit'; side: 'YES' | 'NO'; amountUsdc: number; txHash: string }
  | { type: 'done'; outcome: DuelOutcome }
  | { type: 'error'; message: string }

export type DuelOutcome = {
  bullStake: number
  bearStake: number
  netUsdc: number
  decision: 'YES' | 'NO' | 'ABSTAIN'
  betTransferTx?: string
  buyOnBehalfTx?: string
  bullRationale: string
  bearRationale: string
}

export type RunDuelParams = {
  signedRoot: any              // user-signed Delegation from /api/mandate
  user: `0x${string}`          // user wallet address
  marketId: string
  marketAddress: `0x${string}`
  marketTitle: string
  capUsdc: number              // human-readable user cap
  onEvent: (e: DuelEvent) => void | Promise<void>
  bullEvidenceCalls?: number   // default 2 — more buys means more conviction
  bearEvidenceCalls?: number   // default 1
}

// Helper to retry a balance read until it differs (RPC stale-read tolerant).
async function readBalanceAfter(
  marketAddress: `0x${string}`,
  before: bigint,
): Promise<bigint> {
  for (let i = 0; i < 8; i++) {
    const cur = await sepoliaPublicClient.readContract({
      address: USDC_SEPOLIA,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [marketAddress],
    })
    if (cur > before) return cur
    await new Promise((r) => setTimeout(r, 1500))
  }
  return before
}

export async function runUserDuel(params: RunDuelParams): Promise<DuelOutcome> {
  const {
    signedRoot, user, marketId, marketAddress, marketTitle,
    capUsdc, onEvent,
    bullEvidenceCalls = 2,
    bearEvidenceCalls = 1,
  } = params

  await onEvent({ type: 'started', user, marketId, capUsdc })

  const environment = getSmartAccountsEnvironment(SEPOLIA_CHAIN_ID)

  // ── 1. Server signs Bull and Bear sub-budgets ─────────────────────────
  // Each child caps half the user's mandate. Both children chain to the
  // user's signed root (parentDelegation = signedRoot).
  const subCapWei = parseUnits(String(Math.floor(capUsdc / 2)), 6)

  const buildSub = async (to: `0x${string}`) => {
    const child = createDelegation({
      from: orchestratorAccount.address,
      to,
      scope: {
        type: ScopeType.Erc20TransferAmount,
        tokenAddress: USDC_SEPOLIA,
        maxAmount: subCapWei,
      },
      parentDelegation: signedRoot,
      salt: generateSalt(),
      environment,
    })
    const signature = await signDelegation({
      privateKey: envVars.ORCHESTRATOR_PRIVATE_KEY,
      delegation: child,
      delegationManager: environment.DelegationManager,
      chainId: SEPOLIA_CHAIN_ID,
    })
    return { ...child, signature }
  }

  const bullBudget = await buildSub(bullAccount.address)
  const bearBudget = await buildSub(bearAccount.address)

  const subCapNum = Number(formatUnits(subCapWei, 6))
  await onEvent({
    type: 'sub-budgets-signed',
    bullCapUsdc: subCapNum,
    bearCapUsdc: subCapNum,
  })

  // ── 2. Per-side: evidence buys + Venice conviction ────────────────────
  // Run sides in series because both x402 settlements use ORCH as the
  // facilitator and parallel runs collide on nonce.
  async function runSide(
    side: 'BULL' | 'BEAR',
    pk: Hex,
    addr: `0x${string}`,
    parentChain: any[],
    nCalls: number,
  ): Promise<{ conviction: Conviction; evidenceSpent: bigint }> {
    let spent = 0n
    const evidence: any[] = []
    for (let i = 0; i < nCalls; i++) {
      if (spent + EVIDENCE_PRICE_USDC > subCapWei) break
      const sideHint = side === 'BULL' ? 'YES' : 'NO'
      const buy = await buyEvidence({
        url: `http://localhost/api/evidence?marketId=${marketId}&side=${sideHint}`,
        buyerPrivateKey: pk,
        buyerAddress: addr,
        parentChain,
        fetchFn: async (req) => (await evidenceHandler(req as any)) as unknown as Response,
      })
      spent += buy.usdcSpent
      evidence.push(buy.evidence)
      await onEvent({
        type: 'side-evidence',
        side,
        n: i + 1,
        signal: buy.evidence.signal,
        sourceUrl: buy.evidence.sourceUrl,
        txHash: buy.settlementTxHash,
        usdcSpent: formatUnits(buy.usdcSpent, 6),
      })
    }

    const remainingCapUsdc = Number(formatUnits(subCapWei - spent, 6))
    const c = await conviction({
      side: side === 'BULL' ? 'YES' : 'NO',
      evidence,
      remainingCapUsdc,
      impliedProb: 0.5, // could read live but adds RPC pressure
      marketQuestion: marketTitle,
    })
    await onEvent({ type: 'side-conviction', side, conviction: c })
    return { conviction: c, evidenceSpent: spent }
  }

  const bull = await runSide('BULL', envVars.BULL_PRIVATE_KEY, bullAccount.address, [bullBudget, signedRoot], bullEvidenceCalls)
  const bear = await runSide('BEAR', envVars.BEAR_PRIVATE_KEY, bearAccount.address, [bearBudget, signedRoot], bearEvidenceCalls)

  const bullStake = bull.conviction.stakeUsdc
  const bearStake = bear.conviction.stakeUsdc
  const netUsdcFloat = bullStake - bearStake
  await onEvent({ type: 'netting', bullStake, bearStake, netUsdc: netUsdcFloat })

  const outcome: DuelOutcome = {
    bullStake,
    bearStake,
    netUsdc: netUsdcFloat,
    decision: 'ABSTAIN',
    bullRationale: bull.conviction.rationale,
    bearRationale: bear.conviction.rationale,
  }

  // ── 3. Abstain or place bet ───────────────────────────────────────────
  const netWei = parseUnits(Math.abs(netUsdcFloat).toFixed(6), 6)
  if (netWei < DUST_USDC) {
    await onEvent({ type: 'abstain', netUsdc: netUsdcFloat, reason: 'stakes too close — market genuinely uncertain' })
    await onEvent({ type: 'done', outcome })
    return outcome
  }

  const isYes = netUsdcFloat > 0
  const decisionSide: 'YES' | 'NO' = isYes ? 'YES' : 'NO'
  const winningWallet = (isYes ? bullWalletSepolia : bearWalletSepolia).extend(erc7710WalletActions())
  const winningChain = isYes ? [bullBudget, signedRoot] : [bearBudget, signedRoot]
  const winningChainEncoded = encodeDelegations(winningChain) as Hex

  const balBefore = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [marketAddress],
  })

  // (a) bet transfer via winning sub's chain
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [marketAddress, netWei],
  })
  const transferHash = await winningWallet.sendTransactionWithDelegation({
    to: USDC_SEPOLIA,
    data: transferData,
    value: 0n,
    permissionContext: winningChainEncoded,
    delegationManager: environment.DelegationManager,
  })
  const transferReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: transferHash })
  if (transferReceipt.status !== 'success') {
    await onEvent({ type: 'error', message: `bet transfer reverted on-chain: ${transferHash}` })
    throw new Error(`bet transfer reverted: ${transferHash}`)
  }
  await onEvent({
    type: 'bet-transfer',
    side: decisionSide,
    amountUsdc: Number(formatUnits(netWei, 6)),
    txHash: transferHash,
  })

  // (b) buyOnBehalf credits the user's wallet — wait for fresh balance
  const balAfter = await readBalanceAfter(marketAddress, balBefore)
  const claimAmount = balAfter - balBefore
  if (claimAmount === 0n) {
    await onEvent({ type: 'error', message: 'market balance unchanged after transfer mined' })
    throw new Error('market balance unchanged')
  }

  const buyHash = await orchestratorWalletSepolia.writeContract({
    address: marketAddress,
    abi: marketAbi,
    functionName: 'buyOnBehalf',
    args: [user, isYes, claimAmount],
  })
  const buyReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: buyHash })
  if (buyReceipt.status !== 'success') {
    await onEvent({ type: 'error', message: `buyOnBehalf reverted: ${buyHash}` })
    throw new Error(`buyOnBehalf reverted: ${buyHash}`)
  }
  await onEvent({
    type: 'bet-credit',
    side: decisionSide,
    amountUsdc: Number(formatUnits(claimAmount, 6)),
    txHash: buyHash,
  })

  outcome.decision = decisionSide
  outcome.betTransferTx = transferHash
  outcome.buyOnBehalfTx = buyHash
  await onEvent({ type: 'done', outcome })
  return outcome
}
