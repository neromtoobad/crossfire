// Mainnet-specific config & accounts for Phase 5.3 (the real 1Shot relay).
// Kept separate from lib/config.ts so the Sepolia code path doesn't accidentally
// pay real ETH/USDC.

import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { env } from './env.js'
import { userAccount } from './config.js'

export const MAINNET_CHAIN_ID = 8453 as const

export const mainnetPublicClient = createPublicClient({
  chain: base,
  transport: http(env.BASE_MAINNET_RPC_URL),
})

export const userWalletMainnet = createWalletClient({
  account: userAccount,
  chain: base,
  transport: http(env.BASE_MAINNET_RPC_URL),
})

// USDC native on Base mainnet — same as what the 1Shot relayer accepts.
export const USDC_MAINNET = env.USDC_BASE_MAINNET
