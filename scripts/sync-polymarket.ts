// Phase 8.15 — sync hundreds of live Polymarket markets into a local cache
// so the feed can render them without hitting Gamma per request.
//
//   npm run sync:polymarket            # 150 top events by 24h volume
//   npm run sync:polymarket -- --limit 300
//   npm run sync:polymarket -- --hot   # 7d hot list (volume24hr×liquidity)
//
// Output: .crossfire/polymarket-cache.json

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), '.crossfire', 'polymarket-cache.json')
const UA = 'CROSSFIRE/0.1 (+https://github.com/neromtoobad/crossfire)'

type RawMarket = {
  id?: string
  slug?: string
  question?: string
  outcomes?: string
  outcomePrices?: string
  volumeNum?: number | string
  liquidityNum?: number | string
  endDate?: string
  active?: boolean
  closed?: boolean
  image?: string
  icon?: string
  bestBid?: number | string
  bestAsk?: number | string
  oneDayPriceChange?: number | string
  oneWeekPriceChange?: number | string
}
type RawEvent = {
  id?: string
  slug?: string
  title?: string
  tags?: Array<string | { label?: string; slug?: string }>
  volume24hr?: number
  liquidity?: number
  endDate?: string
  image?: string
  markets?: RawMarket[]
}

// Tag normalization — Polymarket has hundreds of raw tags; map to a sane bucket.
const TAG_MAP: Array<[RegExp, string]> = [
  [/soccer|football|fifa|world cup|premier league|champions league|la liga|epl|mls|uefa/i, 'sports'],
  [/nba|basketball/i, 'sports'],
  [/nfl|nhl|mlb|tennis|golf|formula 1|f1|ufc|boxing|cricket|rugby/i, 'sports'],
  [/esports|league of legends|cs:?go|valorant|dota/i, 'sports'],
  [/bitcoin|btc|ethereum|eth|solana|sol\b|crypto|defi|stablecoin|altcoin|polymarket|kalshi/i, 'crypto'],
  [/openai|gpt|claude|anthropic|gemini|ai\b|llm|nvidia|apple|google|tesla|meta|microsoft|tech|startup|ipo/i, 'tech'],
  [/trump|biden|election|senate|congress|president|democrat|republican|gop|impeach|supreme court/i, 'politics'],
  [/fed|fomc|inflation|cpi|gdp|rate|yield|recession|jobs report|nfp|gold|oil|treasury/i, 'macro'],
  [/israel|hamas|hezbollah|iran|russia|ukraine|china|taiwan|north korea|geopolitic|war|ceasefire/i, 'geopolitics'],
  [/oscar|grammy|emmy|movie|netflix|disney|spotify|taylor swift|kardashian|kanye|drake|celebrity/i, 'culture'],
]

function normalizeTag(rawTags: Array<string | { label?: string; slug?: string }>): string {
  const labels = rawTags
    .map((t) => (typeof t === 'string' ? t : t.label ?? t.slug ?? ''))
    .filter(Boolean)
    .map((s) => s.toLowerCase())
  const joined = labels.join(' ')
  for (const [re, bucket] of TAG_MAP) {
    if (re.test(joined)) return bucket
  }
  return 'other'
}

type SyncOpts = { limit: number; hot: boolean }
function parseArgs(): SyncOpts {
  const argv = process.argv.slice(2)
  const getNum = (name: string, def: number) => {
    const i = argv.indexOf(`--${name}`)
    return i >= 0 ? Number(argv[i + 1]) : def
  }
  return { limit: getNum('limit', 150), hot: argv.includes('--hot') }
}

async function fetchEvents(limit: number, order: string): Promise<RawEvent[]> {
  const out: RawEvent[] = []
  // Gamma caps page size at 100.
  for (let offset = 0; offset < limit; offset += 100) {
    const pageLimit = Math.min(100, limit - offset)
    const url = `https://gamma-api.polymarket.com/events?limit=${pageLimit}&active=true&closed=false&order=${order}&ascending=false&offset=${offset}`
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
    if (!r.ok) {
      console.warn(`  ⚠ offset=${offset} returned HTTP ${r.status}`)
      break
    }
    const arr = (await r.json()) as RawEvent[]
    if (!arr.length) break
    out.push(...arr)
    if (arr.length < pageLimit) break
  }
  return out
}

async function main() {
  const { limit, hot } = parseArgs()
  const order = hot ? 'volume24hr' : 'volume24hr'
  console.log(`▸ syncing top ${limit} Polymarket events (order=${order})…`)

  const events = await fetchEvents(limit, order)
  console.log(`  ✓ fetched ${events.length} events`)

  type CachedMarket = {
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

  const cached: CachedMarket[] = []
  for (const e of events) {
    const tags = (e.tags ?? []).map((t) => (typeof t === 'string' ? t : t.label ?? t.slug ?? '')).filter(Boolean)
    if (tags.includes('Hide From New')) continue
    const bucket = normalizeTag(e.tags ?? [])
    const markets = e.markets ?? []
    for (const m of markets) {
      if (!m.slug || m.closed || !m.outcomePrices) continue
      let prices: string[] = []
      try { prices = JSON.parse(m.outcomePrices) } catch { continue }
      if (prices.length < 2) continue
      const yes = Number(prices[0])
      const no = Number(prices[1])
      if (!Number.isFinite(yes) || !Number.isFinite(no)) continue

      cached.push({
        id: String(m.id ?? m.slug),
        slug: m.slug,
        question: m.question ?? '',
        yes, no,
        volumeUsd: Number(m.volumeNum ?? 0),
        liquidityUsd: Number(m.liquidityNum ?? 0),
        endDate: m.endDate,
        image: m.image,
        oneDayPriceChange: m.oneDayPriceChange != null ? Number(m.oneDayPriceChange) : undefined,
        oneWeekPriceChange: m.oneWeekPriceChange != null ? Number(m.oneWeekPriceChange) : undefined,
        eventSlug: e.slug ?? '',
        eventTitle: e.title ?? '',
        eventVolume24h: Number(e.volume24hr ?? 0),
        bucket,
        rawTags: tags,
      })
    }
  }

  // Sort: volume desc within each bucket; drop very illiquid stuff.
  const filtered = cached.filter((m) => m.volumeUsd >= 1_000)
  filtered.sort((a, b) => b.volumeUsd - a.volumeUsd)

  const byBucket = new Map<string, number>()
  for (const m of filtered) byBucket.set(m.bucket, (byBucket.get(m.bucket) ?? 0) + 1)
  console.log(`  ✓ ${filtered.length} markets after filtering (volume >= $1k)`)
  for (const [b, n] of [...byBucket.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${b.padEnd(12)} ${n}`)
  }

  mkdirSync(resolve(process.cwd(), '.crossfire'), { recursive: true })
  writeFileSync(OUT, JSON.stringify({
    syncedAt: new Date().toISOString(),
    sourceEvents: events.length,
    totalMarkets: filtered.length,
    markets: filtered,
  }, null, 2))
  console.log(`  ✓ wrote ${OUT}`)
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1) })
