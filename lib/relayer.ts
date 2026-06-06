// Phase 5 — Prompt 5.1.
// Thin JSON-RPC client for 1Shot's public relayer.
//
// API shape (verified from https://1shotapi.com/.well-known/skills/public-relayer/references/schemas.md):
//
//   relayer_getCapabilities(chainIds: string[])      → {chainId: {feeCollector, targetAddress, tokens: [{address, decimals, symbol?}]}}
//   relayer_getFeeData({chainId, token})             → {gasPrice, rate, minFee, expiry, feeCollector, context?}
//   relayer_estimate7710Transaction(send-shape -ctx) → {success, gasUsed, requiredPaymentAmount, context}
//   relayer_send7710Transaction({                    → TaskId
//     chainId,
//     transactions: [{
//       permissionContext: Delegation[],             // raw delegation OBJECTS, not encoded bytes
//       executions: [{target, value, data}],
//     }],
//     authorizationList?: EIP-7702 entries (≤1),
//     context, destinationUrl?, memo?, taskId?,
//   })
//   relayer_getStatus({id, logs: boolean})           → {status: 100|110|200|400|500, hash?, receipt?, message?, data?}
//
// Status codes: 100=Pending · 110=Submitted · 200=Confirmed · 400=Rejected · 500=Reverted

import type { Delegation } from '@metamask/smart-accounts-kit'
import type { Hex } from 'viem'
import { env } from './env.js'

export type RelayerChainId = 8453 | 84532 // Base mainnet, Base Sepolia

export const RelayerStatus = {
  Pending: 100,
  Submitted: 110,
  Confirmed: 200,
  Rejected: 400,
  Reverted: 500,
} as const

export const TERMINAL_STATUSES: number[] = [
  RelayerStatus.Confirmed,
  RelayerStatus.Rejected,
  RelayerStatus.Reverted,
]

export function statusName(s: number): string {
  switch (s) {
    case 100: return 'Pending'
    case 110: return 'Submitted'
    case 200: return 'Confirmed'
    case 400: return 'Rejected'
    case 500: return 'Reverted'
    default:  return `Unknown(${s})`
  }
}

export type CapabilitiesResponse = Record<
  string,
  {
    feeCollector: Hex
    targetAddress: Hex
    tokens: Array<{ address: Hex; decimals: number | string; symbol?: string; name?: string }>
  }
>

export type FeeDataResponse = {
  chainId: string
  token: { address: Hex; decimals: number; symbol?: string; name?: string }
  rate: number
  minFee: string
  expiry: number
  gasPrice: Hex
  feeCollector: Hex
  targetAddress?: Hex
  context?: string
}

export type EstimateResponse = {
  success: boolean
  paymentTokenAddress?: Hex
  paymentChain?: number
  gasUsed: Record<string, string>
  requiredPaymentAmount?: string
  context?: string
  contextByChainId?: Record<string, string>
  error?: string
}

export type SignedDelegationLike = Delegation & { signature: Hex }

export type Execution = {
  target: Hex
  value: string // wei (decimal or 0x-hex)
  data: Hex
}

export type RelayedTransaction = {
  permissionContext: SignedDelegationLike[]
  executions: Execution[]
}

export type EIP7702AuthorizationEntry = {
  address: Hex
  chainId: number | string
  nonce: number | string
  r: Hex
  s: Hex
  yParity: number | string
}

export type Send7710Params = {
  chainId: RelayerChainId | string
  transactions: RelayedTransaction[]
  authorizationList?: EIP7702AuthorizationEntry[] // ≤1 per spec
  context?: string
  taskId?: Hex
  destinationUrl?: string
  memo?: string
}

export type StatusResponse = {
  id: Hex
  chainId: string
  createdAt: number
  status: number
  memo?: string
  hash?: Hex
  receipt?: {
    blockHash: string
    blockNumber: string
    gasUsed: string
    transactionHash: string
    logs?: unknown[]
  }
  message?: string
  data?: string
}

// ── Core JSON-RPC client ──────────────────────────────────────────────────
async function rpc<T>(method: string, params: unknown): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (env.ONESHOT_API_KEY) {
    headers['authorization'] = `Bearer ${env.ONESHOT_API_KEY}`
    headers['x-api-key'] = env.ONESHOT_API_KEY
  }
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  const res = await fetch(env.ONESHOT_RELAYER_URL, { method: 'POST', headers, body })
  const text = await res.text()
  if (!res.ok) throw new Error(`1Shot ${method} HTTP ${res.status}: ${text.slice(0, 400)}`)
  let json: any
  try { json = JSON.parse(text) }
  catch { throw new Error(`1Shot ${method} returned non-JSON: ${text.slice(0, 200)}`) }
  if (json.error) throw new Error(`1Shot ${method} JSON-RPC error: ${JSON.stringify(json.error)}`)
  return json.result as T
}

// ── Typed methods ─────────────────────────────────────────────────────────
export const relayer = {
  async getCapabilities(chainIds: Array<RelayerChainId | string | number>): Promise<CapabilitiesResponse> {
    return rpc<CapabilitiesResponse>('relayer_getCapabilities', chainIds.map(String))
  },

  async getFeeData(params: { chainId: RelayerChainId; token: Hex }): Promise<FeeDataResponse> {
    return rpc<FeeDataResponse>('relayer_getFeeData', {
      chainId: String(params.chainId),
      token: params.token,
    })
  },

  /** Validate + price-lock a relay without persisting. Returns a fresh `context` to pass to send. */
  async estimate7710Transaction(params: Omit<Send7710Params, 'context'>): Promise<EstimateResponse> {
    return rpc<EstimateResponse>('relayer_estimate7710Transaction', {
      ...params,
      chainId: String(params.chainId),
    })
  },

  async send7710Transaction(params: Send7710Params): Promise<Hex> {
    return rpc<Hex>('relayer_send7710Transaction', {
      ...params,
      chainId: String(params.chainId),
    })
  },

  async getStatus(id: Hex, includeLogs = false): Promise<StatusResponse> {
    return rpc<StatusResponse>('relayer_getStatus', { id, logs: includeLogs })
  },
}
