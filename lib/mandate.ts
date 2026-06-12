// Phase 1, Prompt 1.3.
// Build and sign the root mandate: a capped, expiring ERC-7710 delegation
// from the USER smart account to the orchestrator. This is the single signature
// the user gives that the chain enforces from then on.
//
// Scope: Erc20TransferAmount on USDC, maxAmount = 50 USDC.
// Caveats:
//   (a) allowedTargets restricted to [USDC]  (we add MARKET in Phase 4)
//   (b) blockNumber range, active now, expires in ~24h (Base Sepolia ~2s blocks)
//
// Phase 1 simplification: the delegate is the ORCH EOA, not the ORCH SA.
// Reason: erc7710WalletActions.sendTransactionWithDelegation submits the
// redemption from a viem WalletClient (EOA-signed), making the EOA the
// delegate avoids needing a bundler or routing through SA.execute() at this
// stage. CLAUDE.md uses orchestratorSmartAccount.address as delegate; we
// match that pattern in Phase 2 redelegation once Bull/Bear/Orch are unified.

import { createDelegation, ScopeType } from '@metamask/smart-accounts-kit'
import { createCaveatBuilder, generateSalt } from '@metamask/smart-accounts-kit/utils'
import { parseUnits } from 'viem'
import { buildUserSmartAccount } from './accounts.js'
import {
  MARKET_ADDRESS,
  orchestratorAccount,
  sepoliaPublicClient,
  USDC_SEPOLIA,
} from './config.js'

export const MANDATE_CAP_USDC = parseUnits('50', 6) // 50 USDC
export const MANDATE_DURATION_BLOCKS = 43200n        // ~24h on Base Sepolia @ 2s blocks

/**
 * Build, sign, and return the root mandate from USER SA → ORCH EOA.
 * Assumes USER SA is already deployed and funded (ERC-1271 signing requires code).
 */
export async function buildRootMandate() {
  const userSA = await buildUserSmartAccount()
  const env = userSA.environment

  const currentBlock = await sepoliaPublicClient.getBlockNumber()

  // afterThreshold gets a 1000-block backdate. Public Base Sepolia RPC routes
  // across nodes with inconsistent heights, without the buffer, the threshold
  // can end up "in the future" relative to the executing node, triggering
  // BlockNumberEnforcer:early-delegation. 1000 blocks = ~33 min of slack.
  const afterThreshold = currentBlock > 1000n ? currentBlock - 1000n : 0n
  const beforeThreshold = currentBlock + MANDATE_DURATION_BLOCKS

  // Compose caveats with the builder. Names map to *Builder functions minus
  // the "Builder" suffix (e.g. allowedTargetsBuilder → "allowedTargets").
  // MARKET_ADDRESS is included when set (Phase 4+) so the orchestrator can
  // call market.buy(...) during bet placement.
  const allowedTargets: `0x${string}`[] = [USDC_SEPOLIA]
  if (MARKET_ADDRESS) allowedTargets.push(MARKET_ADDRESS)

  const caveats = createCaveatBuilder(env)
    .addCaveat('allowedTargets', { targets: allowedTargets })
    .addCaveat('blockNumber', { afterThreshold, beforeThreshold })
    .build()

  // Fresh salt per signing → fresh delegation hash → fresh on-chain spend
  // counter in the Erc20TransferAmount enforcer. Without this, every script
  // run hits the SAME delegation hash and the enforcer tracks cumulative
  // spend across all runs, eventually firing allowance-exceeded on tiny
  // evidence buys. Demo runs are fresh-signed each time; the "sign once"
  // user-facing narrative still holds (one signing per user session).
  const delegation = createDelegation({
    from: userSA.address,
    to: orchestratorAccount.address,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_SEPOLIA,
      maxAmount: MANDATE_CAP_USDC,
    },
    caveats,
    salt: generateSalt(),
    environment: env,
  })

  // Sign with the USER SA. Returns the signature (or signed delegation -
  // we normalize below).
  const signed = await userSA.signDelegation({ delegation })

  // The kit returns the signature attached. Normalize to a delegation
  // object that has a `.signature` field for the encoder.
  const signedDelegation =
    typeof signed === 'string'
      ? ({ ...delegation, signature: signed } as typeof delegation & { signature: `0x${string}` })
      : (signed as typeof delegation & { signature: `0x${string}` })

  return {
    userSA,
    delegation,
    signedDelegation,
    delegationManager: env.DelegationManager,
    expiresAtBlock: beforeThreshold,
  }
}
