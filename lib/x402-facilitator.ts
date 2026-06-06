// Phase 3 — seller-side x402 helpers.
//
// The facilitator's job:
//   1. Build a PAYMENT-REQUIRED descriptor for unpaid requests.
//   2. Validate a PAYMENT-SIGNATURE submitted by the buyer (basic shape check).
//   3. Settle: call DelegationManager.redeemDelegations using the buyer's
//      signed chain, executing USDC.transfer(payTo, amount). This is what
//      makes the spend "metered on-chain" — real USDC actually moves.
//
// In production the facilitator is a third-party (e.g. Coinbase CDP). For the
// hackathon, the seller IS the facilitator and uses ORCH EOA as the redeemer.
// That's the address judges will see in PAYMENT-REQUIRED.extra.facilitators
// and as the msg.sender of the redeemDelegations tx.

import type { Hex } from 'viem'
import { encodeFunctionData, erc20Abi, parseAbi } from 'viem'
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
  // (My earlier hand-rolled abi.encode produced the wrong layout — the
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
