// Backed-calls store, records which calls a user has faded/followed, so The
// Vault can show them. Runtime state (gitignored). One bet per user+call
// (re-backing updates it).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

const DIR = STATE_BASE
const FILE = resolve(DIR, 'bets.json')

export type Bet = {
  user: string             // wallet address, lowercased
  callId: string
  marketId: string
  marketTitle: string
  agentHandle: string      // the lead agent the user followed/faded
  choice: 'follow' | 'fade'
  side: 'YES' | 'NO'       // the side the user actually bet
  amountUsdc: number
  ts: number
}

function read(): Bet[] {
  try { return (JSON.parse(readFileSync(FILE, 'utf8')).bets as Bet[]) ?? [] } catch { return [] }
}
function write(bets: Bet[]): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify({ bets }, null, 2))
}

export function recordBet(b: Bet): void {
  const user = b.user.toLowerCase()
  const kept = read().filter((x) => !(x.user === user && x.callId === b.callId))
  kept.push({ ...b, user })
  write(kept)
}

export function listBetsForUser(user: string): Bet[] {
  const u = user.toLowerCase()
  return read().filter((b) => b.user === u).sort((a, b) => b.ts - a.ts)
}
