// Phase 8.14 — auto-running council cron.
//
// Picks the market with the oldest "last published call" (or never) and
// runs the council on it. Sleeps the configured interval and repeats.
// During the demo, judges open the site and a fresh card lands while
// they watch.
//
// Cost-aware defaults:
//   - stub evidence by default (no USDC moves; ~5s per attempt; gate
//     still works, but won't usually publish — that's fine, the EVENT
//     stream proves the council is alive).
//   - --real to do full x402 evidence buys + on-chain bond (costs ~2-9
//     USDC per published call; cap with --max-runs).
//
// Usage:
//   npm run council:auto                    # stub, 5-min interval, forever
//   npm run council:auto -- --interval 2    # stub, 2-min interval
//   npm run council:auto -- --real --max-runs 4   # 4 real runs, then stop
//   npm run council:auto -- --once          # one run, exit
//
// Picks the market with the maximum staleness using last `publishedAt`
// from .crossfire/calls.json (and the SAMPLE_CALLS fallback). Markets
// never called are picked first.

import { setTimeout as sleep } from 'node:timers/promises'
import { loadMarketsMeta } from '../lib/markets-data.js'
import { runCouncil } from '../lib/council/orchestrator.js'

type Args = {
  intervalMs: number
  stub: boolean
  once: boolean
  maxRuns?: number
  marketId?: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`)
    if (i < 0) return undefined
    return argv[i + 1]
  }
  const has = (name: string) => argv.includes(`--${name}`)
  const intervalMin = Number(get('interval') ?? '5')
  const maxRuns = get('max-runs') ? Number(get('max-runs')) : undefined
  return {
    intervalMs: Math.max(30, intervalMin * 60) * 1000,
    stub: !has('real'),
    once: has('once'),
    maxRuns,
    marketId: get('market'),
  }
}

function lastPublishedByMarket(): Map<string, number> {
  const out = new Map<string, number>()
  try {
    const mod = require('../lib/calls-store.js') as typeof import('../lib/calls-store.js')
    const stored = mod.loadStoredCalls()
    for (const c of stored) {
      const prev = out.get(c.marketId) ?? 0
      if (c.publishedAt > prev) out.set(c.marketId, c.publishedAt)
    }
  } catch { /* no store yet */ }
  return out
}

function pickStalestMarket(prefer?: string): string | null {
  const meta = loadMarketsMeta()
  if (meta.length === 0) return null
  if (prefer) return meta.some((m) => m.id === prefer) ? prefer : null

  const last = lastPublishedByMarket()
  // Markets never called come first (treated as -Infinity staleness).
  let bestId: string | null = null
  let bestStaleness = -Infinity
  for (const m of meta) {
    const t = last.get(m.id) ?? 0
    const staleness = Date.now() - t
    if (staleness > bestStaleness) {
      bestStaleness = staleness
      bestId = m.id
    }
  }
  return bestId
}

async function runOnce(stub: boolean, prefer?: string): Promise<{ ok: boolean; marketId: string | null; outcome: string }> {
  const marketId = pickStalestMarket(prefer)
  if (!marketId) return { ok: false, marketId: null, outcome: 'no markets in markets.json' }
  let outcome = 'no events'
  const ts = new Date().toISOString().slice(11, 19)
  process.stdout.write(`[${ts}] ▸ council → ${marketId.padEnd(22)} `)
  try {
    await runCouncil(marketId, {
      stubEvidence: stub,
      persist: true,
      onEvent: (e) => {
        if (e.type === 'published') outcome = `PUBLISHED side=${e.call.side} @ ${(e.call.selectedSideProb * 100).toFixed(0)}%`
        else if (e.type === 'refused') outcome = `refused (${e.reason.slice(0, 80)})`
        else if (e.type === 'error') outcome = `error: ${e.message.slice(0, 80)}`
      },
    })
  } catch (e) {
    outcome = `THROW: ${(e as Error).message.slice(0, 80)}`
    process.stdout.write(`✗ ${outcome}\n`)
    return { ok: false, marketId, outcome }
  }
  process.stdout.write(`${outcome.startsWith('PUBLISHED') ? '✓' : outcome.startsWith('refused') ? '·' : '✗'} ${outcome}\n`)
  return { ok: true, marketId, outcome }
}

async function main() {
  const args = parseArgs()
  console.log(
    `\nCROSSFIRE auto-council\n` +
    `  mode:     ${args.stub ? 'stub-evidence (no USDC cost)' : 'REAL evidence + on-chain bond'}\n` +
    `  interval: ${args.intervalMs / 1000}s\n` +
    (args.maxRuns ? `  max-runs: ${args.maxRuns}\n` : '') +
    `  preferred market: ${args.marketId ?? '(picks stalest)'}\n` +
    `─`.repeat(80),
  )

  let count = 0
  // Don't repeat forever if the queue is single-market — pick stalest gives
  // a fair rotation across all configured markets.
  while (true) {
    await runOnce(args.stub, args.marketId)
    count += 1
    if (args.once) break
    if (args.maxRuns && count >= args.maxRuns) {
      console.log(`\nReached max-runs (${args.maxRuns}). Exiting.`)
      break
    }
    await sleep(args.intervalMs)
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
