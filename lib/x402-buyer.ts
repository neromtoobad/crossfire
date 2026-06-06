// Phase 3 — Prompt 3.2. The metered, on-chain costly-signal buyer.
//
// Flow per call:
//   1. POST evidence URL → seller returns 402 with PAYMENT-REQUIRED header.
//   2. Decode PAYMENT-REQUIRED, assert assetTransferMethod === "erc7710".
//   3. Build an open delegation:
//        from: buyer EOA
//        scope: Erc20TransferAmount on accepted.asset, maxAmount = accepted.amount
//        caveats: [redeemer: accepted.extra.facilitators]
//        parentDelegation: buyer's sub-budget (so payment draws from USER SA
//                          through the existing chain — never from the buyer's
//                          own EOA holdings).
//   4. Sign with the buyer's private key.
//   5. encodeDelegations([open, ...parentChain]) → permissionContext (leaf-to-root).
//   6. Wrap into x402 paymentPayload, base64 it, retry POST with PAYMENT-SIGNATURE.
//   7. Seller settles (real USDC moves), returns evidence + settlement tx hash.

import {
  createOpenDelegation,
  ScopeType,
  signDelegation,
  type Delegation,
} from '@metamask/smart-accounts-kit'
import {
  createCaveatBuilder,
  encodeDelegations,
  generateSalt,
} from '@metamask/smart-accounts-kit/utils'
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'
import type { Hex } from 'viem'
import { SEPOLIA } from './config.js'
import type {
  EvidenceItem,
  X402PaymentPayload,
  X402PaymentRequired,
} from './x402-types.js'

type SignedDelegation = Delegation & { signature: `0x${string}` }

export type BuyEvidenceResult = {
  evidence: EvidenceItem
  usdcSpent: bigint
  settlementTxHash: Hex
  facilitator: `0x${string}`
}

/**
 * Buy a single evidence item via x402 + ERC-7710 delegation.
 * `fetchFn` lets the caller plug in either a Next.js route handler (direct
 * call, no server) or a real fetch against a running URL. Same wire format
 * either way.
 */
export async function buyEvidence({
  url,
  buyerPrivateKey,
  buyerAddress,
  parentChain,
  fetchFn,
}: {
  url: string
  buyerPrivateKey: Hex
  buyerAddress: `0x${string}`
  parentChain: SignedDelegation[] // leaf-first parent chain, e.g. [bullBudget, root]
  fetchFn: (req: Request) => Promise<Response>
}): Promise<BuyEvidenceResult> {
  // ── (1) Initial request — expect 402 ──────────────────────────────────────
  const first = await fetchFn(new Request(url, { method: 'POST' }))
  if (first.status !== 402) {
    throw new Error(`x402: expected 402 on first call, got ${first.status}`)
  }

  // ── (2) Decode PAYMENT-REQUIRED ──────────────────────────────────────────
  const requiredHeader =
    first.headers.get('PAYMENT-REQUIRED') ?? first.headers.get('payment-required')
  if (!requiredHeader) throw new Error('x402: no PAYMENT-REQUIRED header')
  const accepted: X402PaymentRequired = JSON.parse(
    Buffer.from(requiredHeader, 'base64').toString('utf8'),
  )
  if (accepted.extra?.assetTransferMethod !== 'erc7710') {
    throw new Error(
      `x402: unsupported assetTransferMethod "${accepted.extra?.assetTransferMethod}"`,
    )
  }
  if (!accepted.extra.facilitators?.length) {
    throw new Error('x402: PAYMENT-REQUIRED missing facilitators')
  }

  const environment = getSmartAccountsEnvironment(SEPOLIA.id)

  // ── (3) Build the open delegation chained under the buyer's sub-budget ───
  const caveats = createCaveatBuilder(environment)
    .addCaveat('redeemer', { redeemers: accepted.extra.facilitators })
    .build()

  // Fresh salt on EVERY x402 buy — otherwise two evidence buys in the same
  // session reuse the same open-delegation hash and the on-chain enforcer
  // sees the 0.5 USDC cap already exhausted from the first one.
  const open = createOpenDelegation({
    from: buyerAddress,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: accepted.asset,
      maxAmount: BigInt(accepted.amount),
    },
    caveats,
    parentDelegation: parentChain[0]!, // child links to the buyer's existing sub-budget
    salt: generateSalt(),
    environment,
  })

  // ── (4) Sign with buyer's key ────────────────────────────────────────────
  const signature = await signDelegation({
    privateKey: buyerPrivateKey,
    delegation: open,
    delegationManager: environment.DelegationManager,
    chainId: SEPOLIA.id,
  })
  const signedOpen: SignedDelegation = { ...open, signature }

  // ── (5) Encode the full chain leaf-to-root ───────────────────────────────
  const permissionContext: Hex = encodeDelegations([signedOpen, ...parentChain])

  // ── (6) Build paymentPayload + retry with PAYMENT-SIGNATURE ──────────────
  const paymentPayload: X402PaymentPayload = {
    x402Version: 2,
    accepted,
    payload: {
      delegationManager: environment.DelegationManager,
      permissionContext,
      delegator: buyerAddress,
    },
  }
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')

  const second = await fetchFn(
    new Request(url, {
      method: 'POST',
      headers: { 'PAYMENT-SIGNATURE': paymentHeader },
    }),
  )

  if (second.status !== 200) {
    const body = await second.text()
    throw new Error(`x402: paid call failed: ${second.status} ${body}`)
  }
  const data = (await second.json()) as {
    evidence: EvidenceItem
    settlement: { txHash: Hex; usdcSettled: string; facilitator: `0x${string}` }
  }

  return {
    evidence: data.evidence,
    usdcSpent: BigInt(data.settlement.usdcSettled),
    settlementTxHash: data.settlement.txHash,
    facilitator: data.settlement.facilitator,
  }
}
