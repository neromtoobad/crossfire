// Tracks which (user, call) pairs have unlocked. After a successful x402
// micropayment to /api/unlock/[callId], we record the unlock so future
// requests from the same wallet can re-fetch the thesis without re-paying.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

const DIR = STATE_BASE
const FILE = resolve(DIR, 'unlocks.json')

export type Unlock = {
  user: string         // lowercased
  callId: string
  amountUsdc: number
  settlementTxHash: string
  unlockedAt: number
}

type Store = { unlocks: Unlock[] }

function load(): Store {
  if (!existsSync(FILE)) return { unlocks: [] }
  try { return JSON.parse(readFileSync(FILE, 'utf8')) as Store }
  catch { return { unlocks: [] } }
}

function save(s: Store): void {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(s, null, 2))
}

const norm = (a: string) => a.toLowerCase()

export function addUnlock(u: Unlock): void {
  const s = load()
  // Don't duplicate; replace if same user+call
  s.unlocks = s.unlocks.filter(
    (x) => !(norm(x.user) === norm(u.user) && x.callId === u.callId),
  )
  s.unlocks.unshift({ ...u, user: norm(u.user) })
  s.unlocks = s.unlocks.slice(0, 500)
  save(s)
}

export function hasUnlocked(user: string, callId: string): boolean {
  return load().unlocks.some(
    (u) => norm(u.user) === norm(user) && u.callId === callId,
  )
}

export function getUnlock(user: string, callId: string): Unlock | undefined {
  return load().unlocks.find(
    (u) => norm(u.user) === norm(user) && u.callId === callId,
  )
}

export function listUserUnlocks(user: string): Unlock[] {
  return load().unlocks.filter((u) => norm(u.user) === norm(user))
}

/**
 * Has this settlement tx hash already been used for any unlock? Prevents a
 * single direct-transfer tx from unlocking multiple calls (replay guard).
 */
export function isTxUsed(txHash: string): boolean {
  return load().unlocks.some((u) => norm(u.settlementTxHash) === norm(txHash))
}
