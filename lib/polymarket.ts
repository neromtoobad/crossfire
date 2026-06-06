// Phase 8.14 — live Polymarket prices for the markets where we have a slug.
//
// Hits the public Gamma API (gamma-api.polymarket.com) with a real UA and
// caches per-slug for 60s to stay polite. Returns a graceful null when the
// slug is unknown / the market is closed / the API misbehaves, so callers
// can fall back to the chain-implied price without crashing.

import { setTimeout as sleep } from 'node:timers/promises'

export type PolymarketPrice = {
  slug: string
  yes: number              // 0..1
  no: number               // 0..1
  active: boolean
  closed: boolean
  question?: string
  fetchedAt: number
  source: 'polymarket'
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { at: number; value: PolymarketPrice | null }>()

const UA = 'CROSSFIRE/0.1 (+https://github.com/neromtoobad/crossfire)'

export async function getPolymarketPrice(slug: string): Promise<PolymarketPrice | null> {
  const now = Date.now()
  const cached = cache.get(slug)
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value

  let attempt = 0
  while (attempt < 2) {
    try {
      const r = await fetch(
        `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}`,
        {
          headers: { 'User-Agent': UA, 'Accept': 'application/json' },
          // Don't ship a 30s hang to the UI.
          signal: AbortSignal.timeout(6000),
        },
      )
      if (!r.ok) { cache.set(slug, { at: now, value: null }); return null }
      const data = await r.json() as unknown
      const arr = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? []
      const m = arr[0] as Record<string, unknown> | undefined
      if (!m) { cache.set(slug, { at: now, value: null }); return null }

      const pricesRaw = m.outcomePrices
      let prices: string[] = []
      try {
        prices = typeof pricesRaw === 'string'
          ? JSON.parse(pricesRaw) as string[]
          : Array.isArray(pricesRaw) ? pricesRaw as string[] : []
      } catch { prices = [] }

      if (prices.length < 2) { cache.set(slug, { at: now, value: null }); return null }

      const yes = Number(prices[0])
      const no  = Number(prices[1])
      if (!Number.isFinite(yes) || !Number.isFinite(no)) {
        cache.set(slug, { at: now, value: null }); return null
      }

      const value: PolymarketPrice = {
        slug,
        yes, no,
        active: Boolean(m.active),
        closed: Boolean(m.closed),
        question: typeof m.question === 'string' ? m.question : undefined,
        fetchedAt: now,
        source: 'polymarket',
      }
      cache.set(slug, { at: now, value })
      return value
    } catch (e) {
      attempt += 1
      if (attempt < 2) { await sleep(250) } // one quick retry, then give up
    }
  }
  cache.set(slug, { at: now, value: null })
  return null
}

// Convenience: batch lookup. Resolves to a Map keyed by slug. Unknown
// slugs are mapped to null instead of throwing.
export async function getPolymarketPrices(slugs: string[]): Promise<Map<string, PolymarketPrice | null>> {
  const out = new Map<string, PolymarketPrice | null>()
  const results = await Promise.all(slugs.map((s) => getPolymarketPrice(s)))
  slugs.forEach((s, i) => out.set(s, results[i] ?? null))
  return out
}
