// Phase 1 chain config: viem clients + EOA accounts for Base Sepolia.
// Mainnet client/accounts are added when Phase 5 (1Shot relay) lands.

import { createPublicClient, createWalletClient, http, type Chain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, base } from 'viem/chains'
import { env } from './env.js'

// ── Chains ────────────────────────────────────────────────────────────────
export const SEPOLIA: Chain = baseSepolia
export const MAINNET: Chain = base

// ── EOA accounts (signers) ─────────────────────────────────────────────────
export const userAccount = privateKeyToAccount(env.USER_PRIVATE_KEY)
export const orchestratorAccount = privateKeyToAccount(env.ORCHESTRATOR_PRIVATE_KEY)
export const bullAccount = privateKeyToAccount(env.BULL_PRIVATE_KEY)
export const bearAccount = privateKeyToAccount(env.BEAR_PRIVATE_KEY)

// ── Public read-only clients ───────────────────────────────────────────────
export const sepoliaPublicClient = createPublicClient({
  chain: SEPOLIA,
  transport: http(env.BASE_SEPOLIA_RPC_URL),
})

export const mainnetPublicClient = createPublicClient({
  chain: MAINNET,
  transport: http(env.BASE_MAINNET_RPC_URL),
})

// ── Wallet clients (one per EOA on Sepolia) ────────────────────────────────
// These send raw transactions when not going through a smart account or 1Shot.
export const userWalletSepolia = createWalletClient({
  account: userAccount,
  chain: SEPOLIA,
  transport: http(env.BASE_SEPOLIA_RPC_URL),
})

export const orchestratorWalletSepolia = createWalletClient({
  account: orchestratorAccount,
  chain: SEPOLIA,
  transport: http(env.BASE_SEPOLIA_RPC_URL),
})

export const bullWalletSepolia = createWalletClient({
  account: bullAccount,
  chain: SEPOLIA,
  transport: http(env.BASE_SEPOLIA_RPC_URL),
})

export const bearWalletSepolia = createWalletClient({
  account: bearAccount,
  chain: SEPOLIA,
  transport: http(env.BASE_SEPOLIA_RPC_URL),
})

// ── Token / contract addresses ─────────────────────────────────────────────
export const USDC_SEPOLIA = env.USDC_BASE_SEPOLIA
export const USDC_MAINNET = env.USDC_BASE_MAINNET
export const MARKET_ADDRESS = env.MARKET_ADDRESS as `0x${string}` | undefined
