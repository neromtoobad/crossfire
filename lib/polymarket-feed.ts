// Phase 8.15, read the cached Polymarket snapshot for the feed watch-list.

import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

export type WatchMarket = {
  id: string
  slug: string
  question: string
  yes: number
  no: number
  volumeUsd: number
  liquidityUsd: number
  endDate?: string
  image?: string
  oneDayPriceChange?: number
  oneWeekPriceChange?: number
  eventSlug: string
  eventTitle: string
  eventVolume24h: number
  bucket: string
  rawTags: string[]
}

export type WatchSnapshot = {
  syncedAt: string
  sourceEvents: number
  totalMarkets: number
  markets: WatchMarket[]
}

const FILE = resolve(STATE_BASE, 'polymarket-cache.json')

let cached: WatchSnapshot | null = null
let cachedMtime = 0

export function loadWatchSnapshot(): WatchSnapshot | null {
  if (!existsSync(FILE)) return null
  try {
    const st = statSync(FILE)
    if (cached && cachedMtime === st.mtimeMs) return cached
    const raw = readFileSync(FILE, 'utf8')
    cached = JSON.parse(raw) as WatchSnapshot
    cachedMtime = st.mtimeMs
    return cached
  } catch { return null }
}

export type WatchlistOptions = {
  perBucket?: number    // max markets per bucket (default 10)
  buckets?: string[]    // bucket order; defaults to top-volume order
  globalLimit?: number  // total markets shown (default 100)
}

export function loadWatchlist(opts: WatchlistOptions = {}): { syncedAt: string | null; byBucket: Map<string, WatchMarket[]> } {
  const snap = loadWatchSnapshot()
  if (!snap) return { syncedAt: null, byBucket: new Map() }
  const perBucket = opts.perBucket ?? 10
  const globalLimit = opts.globalLimit ?? 100
  const byBucket = new Map<string, WatchMarket[]>()
  let count = 0
  for (const m of snap.markets) {
    if (count >= globalLimit) break
    const cur = byBucket.get(m.bucket) ?? []
    if (cur.length >= perBucket) continue
    cur.push(m)
    byBucket.set(m.bucket, cur)
    count++
  }
  return { syncedAt: snap.syncedAt, byBucket }
}
