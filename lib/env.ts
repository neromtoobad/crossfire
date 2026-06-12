// Centralized env access. Throws loudly if anything required is missing -
// better to fail at script startup than mid-redemption.

import { config } from 'dotenv'
import { resolve } from 'node:path'

// Load .env.local (Next.js convention, takes priority) then .env (fallback defaults).
// dotenv won't overwrite already-set env vars, so this ordering is correct.
config({ path: [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')] })

// During `next build` (collect-page-data imports every route module), env vars
// may be absent, defer the hard failure to real runtime so the build completes.
const BUILD = process.env.NEXT_PHASE === 'phase-production-build'

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '') {
    if (BUILD) return ''
    throw new Error(`Missing required env var: ${name} (check .env.local)`)
  }
  return v
}

function optional(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() !== '' ? v : undefined
}

// Build-phase placeholders are VALID hex shapes (a real 32-byte key / 20-byte
// address) so viem's privateKeyToAccount()/address validation, which some
// modules run at import, doesn't throw during `next build`. Never used for
// real signing; at runtime the actual env value is present.
const BUILD_PK = ('0x' + '0'.repeat(63) + '1') as `0x${string}`
const BUILD_ADDR = ('0x' + '0'.repeat(40)) as `0x${string}`

function pk(name: string): `0x${string}` {
  const v = required(name)
  if (BUILD && !v) return BUILD_PK
  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error(`${name} must be a 0x-prefixed 64-hex-char private key`)
  }
  return v as `0x${string}`
}

function addr(name: string, value: string): `0x${string}` {
  if (BUILD && !value) return BUILD_ADDR
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} must be a 0x-prefixed 20-byte address: got "${value}"`)
  }
  return value as `0x${string}`
}

// LAZY getters: a missing required var throws only when that value is actually
// ACCESSED (at runtime, in the route/script that needs it), NOT at import time.
// This keeps `next build` from crashing on a deploy that hasn't set every env
// var yet; pages that never touch chain/keys still build + render.
export const env = {
  // Venice (Phase 3+)
  get VENICE_API_KEY() { return optional('VENICE_API_KEY') },

  // 1Shot (Phase 5)
  get ONESHOT_API_KEY() { return optional('ONESHOT_API_KEY') },
  get ONESHOT_RELAYER_URL() { return optional('ONESHOT_RELAYER_URL') ?? 'https://relayer.1shotapi.com/relayers' },

  // RPC
  get BASE_SEPOLIA_RPC_URL() { return required('BASE_SEPOLIA_RPC_URL') },
  get BASE_MAINNET_RPC_URL() { return required('BASE_MAINNET_RPC_URL') },

  // EOAs (Phase 1+)
  get USER_PRIVATE_KEY() { return pk('USER_PRIVATE_KEY') },
  get ORCHESTRATOR_PRIVATE_KEY() { return pk('ORCHESTRATOR_PRIVATE_KEY') },
  get BULL_PRIVATE_KEY() { return pk('BULL_PRIVATE_KEY') },
  get BEAR_PRIVATE_KEY() { return pk('BEAR_PRIVATE_KEY') },

  // USDC (verified from Circle)
  get USDC_BASE_SEPOLIA() { return addr('USDC_BASE_SEPOLIA', required('USDC_BASE_SEPOLIA')) },
  get USDC_BASE_MAINNET() { return addr('USDC_BASE_MAINNET', required('USDC_BASE_MAINNET')) },

  // Market, filled after Phase 4
  get MARKET_ADDRESS() { return optional('MARKET_ADDRESS') },
}
