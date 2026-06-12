// Phase 3, seller-side x402 helpers.
//
// The facilitator's job:
//   1. Build a PAYMENT-REQUIRED descriptor for unpaid requests.
//   2. Validate a PAYMENT-SIGNATURE submitted by the buyer (basic shape check).
//   3. Settle: call DelegationManager.redeemDelegations using the buyer's
//      signed chain, executing USDC.transfer(payTo, amount). This is what
//      makes the spend "metered on-chain", real USDC actually moves.
//
// In production the facilitator is a third-party (e.g. Coinbase CDP). For the
// hackathon, the seller IS the facilitator and uses ORCH EOA as the redeemer.
// That's the address judges will see in PAYMENT-REQUIRED.extra.facilitators
// and as the msg.sender of the redeemDelegations tx.

import type { Hex } from 'viem'
import { encodeFunctionData, erc20Abi, getAddress, parseAbi, parseEventLogs } from 'viem'
import { createExecution, ExecutionMode } from '@metamask/smart-accounts-kit'
import { encodeSingleExecution } from '@metamask/smart-accounts-kit/utils'
import {
  orchestratorAccount,
  orchestratorWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
} from './config.js'
import type { X402PaymentPayload, X402PaymentRequired } from './x402-types.js'

const EVIDENCE_PRICE_USDC = 500_000n // 0.5 USDC per call (6 decimals)
export const FACILITATOR_ADDRESS = orchestratorAccount.address
export const SELLER_PAY_TO = orchestratorAccount.address // seller == facilitator for Phase 3

/** Build the 402 descriptor the seller returns when there's no payment. */
export function paymentRequired(): X402PaymentRequired {
  return {
    scheme: 'exact',
    network: 'base-sepolia',
    amount: EVIDENCE_PRICE_USDC.toString(),
    asset: USDC_SEPOLIA,
    payTo: SELLER_PAY_TO,
    maxTimeoutSeconds: 60,
    extra: {
      assetTransferMethod: 'erc7710',
      facilitators: [FACILITATOR_ADDRESS],
    },
  }
}

/** Base64-encode the PAYMENT-REQUIRED JSON for the response header. */
export function encodePaymentRequiredHeader(req: X402PaymentRequired): string {
  return Buffer.from(JSON.stringify(req)).toString('base64')
}

/** Decode + parse the PAYMENT-SIGNATURE header into a typed payload. */
export function decodePaymentSignatureHeader(header: string): X402PaymentPayload {
  const json = Buffer.from(header, 'base64').toString('utf8')
  const parsed = JSON.parse(json)
  // Minimal shape validation (per Prompt 3.1 "presence + shape")
  if (parsed.x402Version !== 2) throw new Error('x402: wrong version')
  if (!parsed.accepted?.extra?.facilitators?.length)
    throw new Error('x402: missing facilitators in accepted')
  if (!parsed.payload?.permissionContext || !parsed.payload?.delegationManager)
    throw new Error('x402: missing payload fields')
  return parsed as X402PaymentPayload
}

/**
 * Settle the payment on-chain. ORCH EOA (the facilitator) calls
 * DelegationManager.redeemDelegations with the buyer's chain, executing
 * USDC.transfer(payTo, amount). USDC moves from the root delegator (USER SA)
 * to the seller, drawn against every cap in the chain.
 *
 * Returns the settlement tx hash so the seller can include it in the
 * response (audit trail).
 */
export async function settlePayment(
  payload: X402PaymentPayload,
): Promise<{ txHash: Hex; usdcSettled: bigint }> {
  const amount = BigInt(payload.accepted.amount)

  // ── Pre-flight: when the delegator is a counterfactual MetaMask Smart
  // Account, the kit's ERC-7715 response carries the factory + factoryData
  // needed to deploy it. If the delegator has no code yet, deploy via the
  // factory(ies) so the DelegationManager can validate signatures via
  // ERC-1271 in the next call.
  const deps = payload.payload.dependencies ?? []
  if (deps.length > 0) {
    const delegatorAddr = payload.payload.delegator as Hex
    const code = await sepoliaPublicClient.getCode({ address: delegatorAddr })
    const isAlreadyDeployed = !!code && code !== '0x'
    if (!isAlreadyDeployed) {
      for (const dep of deps) {
        if (!dep.factory || !dep.factoryData) continue
        const deployTx = await orchestratorWalletSepolia.sendTransaction({
          to: dep.factory,
          data: dep.factoryData,
          value: 0n,
        })
        const deployReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: deployTx })
        if (deployReceipt.status !== 'success') {
          throw new Error(`SCA factory deploy reverted: ${deployTx}`)
        }
      }
    }
  }

  // The inner action the redemption performs on behalf of the root delegator:
  //   USDC.transfer(payTo, amount)
  const transferCalldata = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [payload.accepted.payTo, amount],
  })

  // Wrap in the kit's ExecutionStruct and encode using its single-call format.
  // (My earlier hand-rolled abi.encode produced the wrong layout, the
  // ValueLteEnforcer that the Erc20TransferAmount scope auto-adds saw
  // garbage in the value slot and rejected the call.)
  const execution = createExecution({
    target: payload.accepted.asset,
    value: 0n,
    callData: transferCalldata,
  })
  const executionCalldata = encodeSingleExecution(execution)

  // DelegationManager.redeemDelegations(bytes[], bytes32[], bytes[])
  const dmAbi = parseAbi([
    'function redeemDelegations(bytes[] permissionContexts, bytes32[] modes, bytes[] executionCalldatas)',
  ])

  // Simulate first to capture the precise revert reason (which enforcer
  // rejected, ERC-1271 failure, etc.). viem's writeContract throws with a
  // helpful 'Details: execution reverted' string but no enforcer name -
  // simulation gives us the named revert.
  try {
    await sepoliaPublicClient.simulateContract({
      account: orchestratorAccount.address,
      address: payload.payload.delegationManager,
      abi: dmAbi,
      functionName: 'redeemDelegations',
      args: [
        [payload.payload.permissionContext],
        [ExecutionMode.SingleDefault as Hex],
        [executionCalldata],
      ],
    })
  } catch (simErr: any) {
    // Extract every layer of viem's error chain so the message tells us
    // which enforcer / which contract rejected.
    const layers: string[] = []
    let cur: any = simErr
    while (cur) {
      if (cur.shortMessage) layers.push(cur.shortMessage)
      if (cur.metaMessages?.length) layers.push(cur.metaMessages.join(' | '))
      if (cur.details && !layers.some((l) => l.includes(cur.details))) layers.push(cur.details)
      cur = cur.cause
    }
    throw new Error(`redeemDelegations simulation failed: ${layers.join(' :: ').slice(0, 600)}`)
  }

  const txHash = await orchestratorWalletSepolia.writeContract({
    address: payload.payload.delegationManager,
    abi: dmAbi,
    functionName: 'redeemDelegations',
    args: [
      [payload.payload.permissionContext],
      [ExecutionMode.SingleDefault as Hex],
      [executionCalldata],
    ],
  })

  const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') {
    throw new Error(`x402 settlement reverted: ${txHash}`)
  }

  return { txHash, usdcSettled: amount }
}

/**
 * Verify a DIRECT USDC transfer as an x402 "exact"-scheme settlement.
 *
 * This is the robust unlock path: the buyer's wallet sends a plain
 * USDC.transfer(payTo, amount), MetaMask signs it as a normal ERC-20 tx
 * with no smart-account / delegation friction. The seller verifies the
 * on-chain transfer landed and matches the requirement.
 *
 * We verify the payment by its EFFECT, not its shape: find a USDC `Transfer`
 * event in this tx's logs that sent >= the price to payTo, originating from the
 * buyer. This works whether the buyer paid from a plain EOA (outer tx.to ===
 * USDC) OR a MetaMask smart account (outer tx.to === DelegationManager and the
 * USDC transfer is an inner call that still emits the Transfer event). Checking
 * the raw outer tx.to/calldata would wrongly reject every smart-account payment.
 *
 * Checks:
 *   1. tx confirmed + status success
 *   2. a USDC Transfer(to=payTo, value>=required) exists in the receipt logs
 *   3. that transfer (or the outer tx) originates from the connected wallet, so
 *      a buyer can't claim a stranger's payment
 *
 * Replay across calls is prevented by the unlock-store (one tx → one unlock).
 */
export async function verifyDirectTransfer(params: {
  txHash: Hex
  expectedFrom: Hex
  payTo: Hex
  asset: Hex
  minAmount: bigint
}): Promise<{ ok: true; amount: bigint } | { ok: false; reason: string }> {
  const { txHash, expectedFrom, payTo, asset, minAmount } = params

  let receipt
  try {
    receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: txHash })
  } catch {
    return { ok: false, reason: `transaction ${txHash} not found on Base Sepolia` }
  }
  if (receipt.status !== 'success') {
    return { ok: false, reason: `transfer tx ${txHash} reverted on-chain` }
  }

  // The outer tx sender (used as a fallback identity check for smart accounts
  // whose Transfer.from is the account, not the connected EOA).
  let txFrom: Hex | undefined
  try { txFrom = (await sepoliaPublicClient.getTransaction({ hash: txHash })).from } catch { /* optional */ }

  // USDC Transfer events emitted by the asset contract in this tx.
  const transfers = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs })
    .filter((l) => getAddress(l.address) === getAddress(asset))
  if (transfers.length === 0) {
    return { ok: false, reason: `no USDC transfer event found in tx ${txHash}` }
  }

  const sameAddr = (a?: Hex) => a != null && getAddress(a) === getAddress(expectedFrom)
  const toPayTo = transfers.filter((t) => {
    const to = (t.args as { to?: Hex }).to
    return to != null && getAddress(to) === getAddress(payTo)
  })
  if (toPayTo.length === 0) {
    return { ok: false, reason: `no USDC transfer to payTo ${payTo} in tx ${txHash}` }
  }

  for (const t of toPayTo) {
    const { from, value } = t.args as { from?: Hex; value?: bigint }
    if ((value ?? 0n) < minAmount) continue
    if (sameAddr(from) || sameAddr(txFrom)) {
      return { ok: true, amount: value ?? minAmount }
    }
  }

  // A correctly-sized transfer to payTo exists but we couldn't bind it to the
  // buyer, surface the precise reason.
  const best = toPayTo.reduce((m, t) => {
    const v = (t.args as { value?: bigint }).value ?? 0n
    return v > m ? v : m
  }, 0n)
  if (best < minAmount) {
    return { ok: false, reason: `transfer amount (${best}) < required (${minAmount})` }
  }
  return { ok: false, reason: `transfer sender doesn't match the connected wallet (${expectedFrom})` }
}
