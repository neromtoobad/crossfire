// Phase 1: smart account builders.
// Each smart account is owned by its corresponding EOA. Hybrid implementation
// is the standard MetaMask smart account; we'll add Stateless7702 in Phase 5
// when 1Shot upgrades the orchestrator in-flight via EIP-7702.

import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
import type { PublicClient } from 'viem'
import {
  bearAccount,
  bullAccount,
  orchestratorAccount,
  sepoliaPublicClient,
  userAccount,
} from './config.js'

type Signer = typeof userAccount

/**
 * Build a Hybrid smart account owned by `owner`, bound to `client`.
 * The account is counterfactual until its first user op is mined.
 */
async function buildHybrid(owner: Signer, client: PublicClient) {
  return toMetaMaskSmartAccount({
    client,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: owner },
  })
}

// Eager builders for Sepolia. Each returns a Promise<smartAccount>.
export const buildUserSmartAccount = () => buildHybrid(userAccount, sepoliaPublicClient)
export const buildOrchestratorSmartAccount = () => buildHybrid(orchestratorAccount, sepoliaPublicClient)
export const buildBullSmartAccount = () => buildHybrid(bullAccount, sepoliaPublicClient)
export const buildBearSmartAccount = () => buildHybrid(bearAccount, sepoliaPublicClient)

/**
 * Returns true if the smart account has any code at its counterfactual address.
 * Used to distinguish counterfactual (never-deployed) from deployed accounts.
 */
export async function isDeployed(
  client: PublicClient,
  address: `0x${string}`,
): Promise<boolean> {
  const code = await client.getCode({ address })
  return !!code && code !== '0x'
}
