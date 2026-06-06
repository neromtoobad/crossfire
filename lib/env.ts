// Centralized env access. Throws loudly if anything required is missing —
// better to fail at script startup than mid-redemption.

import { config } from 'dotenv'
import { resolve } from 'node:path'

// Load .env.local (Next.js convention, takes priority) then .env (fallback defaults).
// dotenv won't overwrite already-set env vars, so this ordering is correct.
config({ path: [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')] })

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name} (check .env.local)`)
  }
  return v
}

function optional(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() !== '' ? v : undefined
}

function pk(name: string): `0x${string}` {
  const v = required(name)
  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error(`${name} must be a 0x-prefixed 64-hex-char private key`)
  }
  return v as `0x${string}`
}

function addr(name: string, value: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} must be a 0x-prefixed 20-byte address: got "${value}"`)
  }
  return value as `0x${string}`
}

export const env = {
  // Venice (Phase 3+)
  VENICE_API_KEY: optional('VENICE_API_KEY'),

  // 1Shot (Phase 5)
  ONESHOT_API_KEY: optional('ONESHOT_API_KEY'),
  ONESHOT_RELAYER_URL: optional('ONESHOT_RELAYER_URL') ?? 'https://relayer.1shotapi.com/relayers',

  // RPC
  BASE_SEPOLIA_RPC_URL: required('BASE_SEPOLIA_RPC_URL'),
  BASE_MAINNET_RPC_URL: required('BASE_MAINNET_RPC_URL'),

  // EOAs (Phase 1+)
  USER_PRIVATE_KEY: pk('USER_PRIVATE_KEY'),
  ORCHESTRATOR_PRIVATE_KEY: pk('ORCHESTRATOR_PRIVATE_KEY'),
  BULL_PRIVATE_KEY: pk('BULL_PRIVATE_KEY'),
  BEAR_PRIVATE_KEY: pk('BEAR_PRIVATE_KEY'),

  // USDC (verified from Circle)
  USDC_BASE_SEPOLIA: addr('USDC_BASE_SEPOLIA', required('USDC_BASE_SEPOLIA')),
  USDC_BASE_MAINNET: addr('USDC_BASE_MAINNET', required('USDC_BASE_MAINNET')),

  // Market — filled after Phase 4
  MARKET_ADDRESS: optional('MARKET_ADDRESS'),
} as const
