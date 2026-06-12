// Phase 8.12, extract scripts/proof.ts into a reusable flow with structured
// events. Same orchestration, no behavior change. The reusable lib lets a UI
// route stream events live, while keeping the CLI script working untouched.
//
// What the flow does:
//   1. Ensure USER SA + ORCH SA deployed + funded (≥10 USDC USER)
//   2. Sign the root mandate (50 USDC cap, 24h, target = USDC)
//   3. As ORCH EOA: redeem the mandate for 1 USDC → MUST succeed
//   4. As ORCH EOA: attempt 60 USDC → MUST revert at the enforcer
//
// The over-cap revert IS the hero shot, no code stops it, the chain does.

import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'
import { encodeDelegations } from '@metamask/smart-accounts-kit/utils'
import {
  decodeErrorResult,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  type Hex,
} from 'viem'
import { ensureDeployed, ensureFunded } from './deploy-sa.js'
import { buildOrchestratorSmartAccount, buildUserSmartAccount } from './accounts.js'
import {
  orchestratorAccount,
  orchestratorWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from './config.js'
import { buildRootMandate, MANDATE_CAP_USDC } from './mandate.js'

const BURN_ADDR: `0x${string}` = '0x000000000000000000000000000000000000dEaD'

export type ProofEvent =
  | { type: 'started'; userEoa: Hex; userSa: Hex; orchEoa: Hex; orchSa: Hex }
  | { type: 'sa-deployed'; which: 'USER' | 'ORCH' }
  | { type: 'sa-funded'; which: 'USER' | 'ORCH' }
  | { type: 'mandate-signed'; capUsdc: string; expiresAtBlock: string; delegationManager: Hex }
  | { type: 'incap-attempt'; amountUsdc: string }
  | { type: 'incap-confirmed'; amountUsdc: string; txHash: Hex }
  | { type: 'overcap-attempt'; amountUsdc: string; capUsdc: string }
  | { type: 'overcap-reverted'; reason: string; capUsdc: string; attemptedUsdc: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type RunProofOptions = {
  onEvent?: (e: ProofEvent) => void | Promise<void>
}

export async function runProofFlow(opts: RunProofOptions = {}): Promise<{
  inCapTxHash: Hex
  overCapReason: string
}> {
  const emit = async (e: ProofEvent) => { await opts.onEvent?.(e) }

  const userSA = await buildUserSmartAccount()
  const orchSA = await buildOrchestratorSmartAccount()
  await emit({
    type: 'started',
    userEoa: userAccount.address, userSa: userSA.address,
    orchEoa: orchestratorAccount.address, orchSa: orchSA.address,
  })

  await ensureDeployed('USER', userSA, userAccount, userWalletSepolia, sepoliaPublicClient)
  await emit({ type: 'sa-deployed', which: 'USER' })
  await ensureFunded(
    'USER', userSA.address, userAccount, userWalletSepolia, sepoliaPublicClient,
    parseUnits('10', 6), parseUnits('10', 6),
  )
  await emit({ type: 'sa-funded', which: 'USER' })

  await ensureDeployed('ORCH', orchSA, orchestratorAccount, orchestratorWalletSepolia, sepoliaPublicClient)
  await emit({ type: 'sa-deployed', which: 'ORCH' })

  const { signedDelegation, delegationManager, expiresAtBlock } = await buildRootMandate()
  await emit({
    type: 'mandate-signed',
    capUsdc: formatUnits(MANDATE_CAP_USDC, 6),
    expiresAtBlock: String(expiresAtBlock),
    delegationManager,
  })

  const permissionContext: Hex = encodeDelegations([signedDelegation])
  const orchClient = orchestratorWalletSepolia.extend(erc7710WalletActions())

  const transferCall = (amount: bigint) => ({
    to: USDC_SEPOLIA,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [BURN_ADDR, amount] }),
    value: 0n,
  })

  // ── (A) IN-CAP redeem: 1 USDC ───────────────────────────────────────
  const oneUsdc = parseUnits('1', 6)
  await emit({ type: 'incap-attempt', amountUsdc: '1' })
  const inCapHash = await orchClient.sendTransactionWithDelegation({
    ...transferCall(oneUsdc),
    permissionContext,
    delegationManager,
  })
  const inCapReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: inCapHash })
  if (inCapReceipt.status !== 'success') {
    const msg = `In-cap redeem tx ${inCapHash} reverted on-chain (unexpected)`
    await emit({ type: 'error', message: msg })
    throw new Error(msg)
  }
  await emit({ type: 'incap-confirmed', amountUsdc: '1', txHash: inCapHash })

  // ── (B) OVER-CAP redeem: 60 USDC, must REVERT ──────────────────────
  const sixtyUsdc = parseUnits('60', 6)
  await emit({
    type: 'overcap-attempt',
    amountUsdc: '60',
    capUsdc: formatUnits(MANDATE_CAP_USDC, 6),
  })
  let overCapReason = ''
  try {
    const hash = await orchClient.sendTransactionWithDelegation({
      ...transferCall(sixtyUsdc),
      permissionContext,
      delegationManager,
    })
    const r = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
    if (r.status === 'success') {
      // This should never happen, the cap MUST be enforced.
      const msg = `OVER-CAP redeem mined successfully, cap not enforced. tx: ${hash}`
      await emit({ type: 'error', message: msg })
      throw new Error(msg)
    }
    overCapReason = `tx ${hash} reverted on-chain (status=reverted)`
  } catch (err: unknown) {
    overCapReason = extractRevertReason(err)
  }
  await emit({
    type: 'overcap-reverted',
    reason: overCapReason,
    capUsdc: formatUnits(MANDATE_CAP_USDC, 6),
    attemptedUsdc: '60',
  })

  await emit({ type: 'done' })
  return { inCapTxHash: inCapHash, overCapReason }
}

function extractRevertReason(err: unknown): string {
  const seen: string[] = []
  let cur: any = err
  while (cur && seen.length < 8) {
    if (cur.shortMessage) seen.push(`shortMessage: ${cur.shortMessage}`)
    if (cur.metaMessages?.length) seen.push(`meta: ${cur.metaMessages.join(' | ')}`)
    if (cur.details) seen.push(`details: ${cur.details}`)
    if (cur.data && typeof cur.data === 'string' && cur.data !== '0x') {
      try {
        const decoded = decodeErrorResult({
          abi: [{ type: 'error', name: 'Error', inputs: [{ type: 'string', name: 'reason' }] }],
          data: cur.data as Hex,
        })
        seen.push(`decoded: ${decoded.errorName}(${JSON.stringify(decoded.args)})`)
      } catch {
        seen.push(`raw data: ${cur.data.slice(0, 130)}…`)
      }
    }
    cur = cur.cause
  }
  return seen.length ? seen.join(' ; ') : String(err).slice(0, 300)
}
