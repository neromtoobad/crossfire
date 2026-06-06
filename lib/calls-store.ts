// File-backed store for published calls. Phase 8.2 writes here; Phase 8.4
// reads here for the landing/feed (alongside the hand-crafted samples).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PublishedCall } from './calls-data.js'

const DIR = resolve(process.cwd(), '.crossfire')
const FILE = resolve(DIR, 'calls.json')

type Store = { calls: PublishedCall[] }

function load(): Store {
  if (!existsSync(FILE)) return { calls: [] }
  try { return JSON.parse(readFileSync(FILE, 'utf8')) as Store }
  catch { return { calls: [] } }
}

function save(s: Store): void {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(s, null, 2))
}

export function addCall(call: PublishedCall): void {
  const s = load()
  s.calls.unshift(call)
  s.calls = s.calls.slice(0, 50) // keep newest 50
  save(s)
}

export function loadStoredCalls(): PublishedCall[] {
  return load().calls
}
