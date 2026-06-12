// Phase 2, Prompts 2.1 + 2.2.
//
// Build the two opposed sub-budgets that make CROSSFIRE adversarial:
//   USER SA ──(root: 50 USDC, signed)──► ORCH EOA
//                                         │
//                                         ├──(child: 20 USDC, signed by ORCH)──► BULL
//                                         └──(child: 20 USDC, signed by ORCH)──► BEAR
//
// Each child delegation has `parentDelegation = signedRoot`, which sets the
// child's `authority` to hash(parent). The chain validates leaf-to-root at
// redemption time. The kit's createDelegation handles the linking; we just
// sign with the parent's delegate (ORCH EOA).
//
// CLAUDE.md footgun (taken seriously):
//   "Each child's delegator must equal the parent's delegate."
//   Here: child.from = ORCH EOA == root.to = ORCH EOA. ✓
//   "Delegation chain order is LEAF-TO-ROOT when encoding [sub, ..., root]."
//   Honored in scripts/duel-skeleton.ts via encodeDelegations([child, root]).
//
// Phase 2 simplification (continuation of Phase 1):
//   Sub-agents are real EOAs, not SAs. Real keypairs that actually redeem
//   on-chain, what the spec really cared about. If Phase 4/5 demands SAs
//   (for the bet placement or 1Shot relay), we either bundle or 7702-upgrade.

import { createDelegation, ScopeType, signDelegation } from '@metamask/smart-accounts-kit'
import type { Delegation } from '@metamask/smart-accounts-kit'
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'
import { generateSalt } from '@metamask/smart-accounts-kit/utils'
import { parseUnits } from 'viem'
import { env as envVars } from './env.js'
import {
  bearAccount,
  bullAccount,
  orchestratorAccount,
  SEPOLIA,
  USDC_SEPOLIA,
} from './config.js'

export const BULL_CAP_USDC = parseUnits('20', 6)
export const BEAR_CAP_USDC = parseUnits('20', 6)

type SignedDelegation = Delegation & { signature: `0x${string}` }

/**
 * Build a child delegation FROM ORCH EOA TO `to`, capped at `capUsdc` USDC,
 * chained under `parentDelegation`, signed by ORCH EOA.
 */
export async function redelegate({
  to,
  capUsdc,
  parentDelegation,
}: {
  to: `0x${string}`
  capUsdc: bigint
  parentDelegation: SignedDelegation
}): Promise<SignedDelegation> {
  const environment = getSmartAccountsEnvironment(SEPOLIA.id)

  const child = createDelegation({
    from: orchestratorAccount.address, // == parentDelegation.delegate (root.to)
    to,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_SEPOLIA,
      maxAmount: capUsdc,
    },
    parentDelegation,
    salt: generateSalt(), // see mandate.ts, keep each run's children fresh too
    environment,
  })

  const signature = await signDelegation({
    privateKey: envVars.ORCHESTRATOR_PRIVATE_KEY,
    delegation: child,
    delegationManager: environment.DelegationManager,
    chainId: SEPOLIA.id,
  })

  return { ...child, signature }
}

/**
 * Convenience: build the Bull sub-budget (20 USDC) under the root mandate.
 */
export async function buildBullBudget(signedRoot: SignedDelegation): Promise<SignedDelegation> {
  return redelegate({
    to: bullAccount.address,
    capUsdc: BULL_CAP_USDC,
    parentDelegation: signedRoot,
  })
}

/**
 * Convenience: build the Bear sub-budget (20 USDC) under the root mandate.
 */
export async function buildBearBudget(signedRoot: SignedDelegation): Promise<SignedDelegation> {
  return redelegate({
    to: bearAccount.address,
    capUsdc: BEAR_CAP_USDC,
    parentDelegation: signedRoot,
  })
}
