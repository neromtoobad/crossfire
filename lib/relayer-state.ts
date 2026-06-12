// Phase 5, file-based state for 1Shot webhook payloads + duel outcomes.
// In production these would live in a real DB. For the hackathon, a JSON
// file at .crossfire/state.json lets the dashboard, webhook handler, and
// scripts share the same source of truth across process restarts.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

const STATE_DIR = STATE_BASE
const STATE_FILE = resolve(STATE_DIR, 'state.json')

export type RelayerEvent = {
  receivedAt: number
  taskId: string
  status: string
  txHash?: string
  rawPayload: unknown
}

export type AppState = {
  duels: Array<{
    runAt: number
    bullStake: number
    bearStake: number
    netUsdc: number
    side: 'YES' | 'NO' | 'ABSTAIN'
    abstained: boolean
    betTransferTx?: string
    buyOnBehalfTx?: string
    bullRationale: string
    bearRationale: string
    evidenceTxHashes: { bull: string[]; bear: string[] }
    marketAfter: { totalYes: string; totalNo: string; impliedProb: number; userSaPosition: { yes: string; no: string } }
  }>
  relayerEvents: RelayerEvent[]
  relayerByTaskId: Record<string, RelayerEvent[]>
  /** Most-recently dispatched 1Shot relay we initiated. */
  latestRelayDispatch?: {
    dispatchedAt: number
    taskId: string
    chainId: number
    memo?: string
    work: { target: string; value: string; callData: string }[]
  }
}

const EMPTY: AppState = {
  duels: [],
  relayerEvents: [],
  relayerByTaskId: {},
}

export function readState(): AppState {
  if (!existsSync(STATE_FILE)) return { ...EMPTY }
  try {
    const raw = readFileSync(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      duels: parsed.duels ?? [],
      relayerEvents: parsed.relayerEvents ?? [],
      relayerByTaskId: parsed.relayerByTaskId ?? {},
      latestRelayDispatch: parsed.latestRelayDispatch,
    }
  } catch {
    return { ...EMPTY }
  }
}

function writeState(s: AppState): void {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
}

export function appendDuel(d: AppState['duels'][number]): void {
  const s = readState()
  s.duels.unshift(d)
  // keep last 20
  s.duels = s.duels.slice(0, 20)
  writeState(s)
}

export function appendRelayerEvent(e: RelayerEvent): void {
  const s = readState()
  s.relayerEvents.unshift(e)
  s.relayerEvents = s.relayerEvents.slice(0, 50)
  const arr = s.relayerByTaskId[e.taskId] ?? []
  arr.unshift(e)
  s.relayerByTaskId[e.taskId] = arr.slice(0, 10)
  writeState(s)
}

export function setLatestRelayDispatch(d: AppState['latestRelayDispatch']): void {
  const s = readState()
  s.latestRelayDispatch = d
  writeState(s)
}
