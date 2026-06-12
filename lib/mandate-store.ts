// Server-side mandate persistence — separate from relayer-state.ts so
// concerns stay decoupled. Each user-mandate pair (user address + market id)
// is keyed and stored as the signed delegation JSON + meta.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

const STATE_DIR = STATE_BASE
const FILE = resolve(STATE_DIR, 'mandates.json')

export type StoredMandate = {
  user: string             // user wallet address (lowercased)
  marketId: string         // matches lib/markets.json id
  marketAddress: string
  capUsdc: number          // human-readable USDC amount
  capWei: string           // bigint as string
  expiresAt: number        // unix ms
  signedDelegation: any    // the full delegation object including signature
  delegationManager: string
  chainId: number
  signedAt: number
  /** Set to true when the user revokes (or mandate expires). */
  revoked?: boolean
  revokedAt?: number
}

type Store = { mandates: StoredMandate[] }

function load(): Store {
  if (!existsSync(FILE)) return { mandates: [] }
  try { return JSON.parse(readFileSync(FILE, 'utf8')) as Store }
  catch { return { mandates: [] } }
}

function save(s: Store): void {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(s, null, 2))
}

const norm = (a: string) => a.toLowerCase()

export function upsertMandate(m: StoredMandate): void {
  const s = load()
  // Remove any previous active mandate from same user on same market
  s.mandates = s.mandates.filter(
    (x) => !(norm(x.user) === norm(m.user) && x.marketId === m.marketId && !x.revoked),
  )
  s.mandates.unshift({ ...m, user: norm(m.user) })
  s.mandates = s.mandates.slice(0, 200)
  save(s)
}

export function getActiveMandate(user: string, marketId: string): StoredMandate | undefined {
  return load().mandates.find(
    (m) => norm(m.user) === norm(user) && m.marketId === marketId && !m.revoked && m.expiresAt > Date.now(),
  )
}

export function listMandatesForUser(user: string): StoredMandate[] {
  return load().mandates.filter((m) => norm(m.user) === norm(user))
}

export function revokeMandate(user: string, marketId: string): boolean {
  const s = load()
  const m = s.mandates.find((x) => norm(x.user) === norm(user) && x.marketId === marketId && !x.revoked)
  if (!m) return false
  m.revoked = true
  m.revokedAt = Date.now()
  save(s)
  return true
}
