// Shared x402 types between seller, facilitator, and buyer.
// Matches the x402 v2 spec with the ERC-7710 ("erc7710") asset transfer method
// — i.e. payment authorization comes from a signed open delegation chain.

import type { Hex } from 'viem'

export type X402PaymentRequired = {
  scheme: 'exact'
  network: 'base-sepolia' | 'base'
  amount: string // base units of `asset`, decimal string (e.g. "500000" = 0.5 USDC)
  asset: `0x${string}` // ERC-20 token address
  payTo: `0x${string}` // where the asset ends up after settlement
  maxTimeoutSeconds: number
  extra: {
    assetTransferMethod: 'erc7710'
    facilitators: `0x${string}`[] // who is allowed to redeem the delegation
  }
}

export type X402PaymentPayload = {
  x402Version: 2
  accepted: X402PaymentRequired
  payload: {
    delegationManager: Hex
    permissionContext: Hex // base64-decoded later; here it's already-encoded delegation chain hex
    delegator: Hex // address whose funds settle the payment
    /**
     * ERC-7715 dependencies. When the delegator is a counterfactual MetaMask
     * Smart Account, these factory + factoryData pairs deploy it before
     * the redemption. If the delegator already has code, deps are skipped.
     */
    dependencies?: Array<{ factory: Hex; factoryData: Hex }>
  }
}

export type EvidenceItem = {
  marketId: string
  signal: 'YES' | 'NO' | 'NEUTRAL'
  sourceUrl: string
  weight: number // 0–1
  payloadDigest?: string
}
