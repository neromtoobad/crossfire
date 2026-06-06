// Reads the 4 themed markets deployed by scripts/deploy-markets.ts and
// fetches live state from Base Sepolia. Used by the landing grid and the
// per-market detail page.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { erc20Abi, formatUnits } from 'viem'
import { sepoliaPublicClient, USDC_SEPOLIA } from './config.js'
import { marketAbi } from './market.js'

export type MarketMeta = {
  id: string
  title: string
  question: string
  address: `0x${string}`
  closeTime: string
  /** Polymarket Gamma slug — when set, the UI shows the live Polymarket price. */
  polymarketSlug?: string
}

export type MarketLive = MarketMeta & {
  totalYes: string
  totalNo: string
  impliedProbYes: number
  closeTimestamp: number
  hoursUntilClose: number
  totalLiquidityUsdc: string
}

let cached: MarketMeta[] | null = null

export function loadMarketsMeta(): MarketMeta[] {
  if (cached) return cached
  try {
    const raw = readFileSync(resolve(process.cwd(), 'lib/markets.json'), 'utf8')
    const parsed = JSON.parse(raw) as { markets: MarketMeta[] }
    cached = parsed.markets
    return cached
  } catch {
    return []
  }
}

export function getMarketMeta(id: string): MarketMeta | undefined {
  return loadMarketsMeta().find((m) => m.id === id)
}

export async function readMarketLive(meta: MarketMeta): Promise<MarketLive> {
  try {
    const [totals, impl, ct, usdcBal] = await Promise.all([
      sepoliaPublicClient.readContract({
        address: meta.address,
        abi: marketAbi,
        functionName: 'totals',
      }) as Promise<readonly [bigint, bigint]>,
      sepoliaPublicClient.readContract({
        address: meta.address,
        abi: marketAbi,
        functionName: 'impliedProbYes',
      }) as Promise<bigint>,
      sepoliaPublicClient.readContract({
        address: meta.address,
        abi: marketAbi,
        functionName: 'closeTime',
      }) as Promise<bigint>,
      sepoliaPublicClient.readContract({
        address: USDC_SEPOLIA,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [meta.address],
      }) as Promise<bigint>,
    ])
    const closeTs = Number(ct)
    const now = Math.floor(Date.now() / 1000)
    return {
      ...meta,
      totalYes: formatUnits(totals[0], 6),
      totalNo: formatUnits(totals[1], 6),
      impliedProbYes: Number(impl) / 1e18,
      closeTimestamp: closeTs,
      hoursUntilClose: Math.max(0, Math.round((closeTs - now) / 3600)),
      totalLiquidityUsdc: formatUnits(usdcBal, 6),
    }
  } catch {
    // RPC hiccup — return safe defaults so the grid still renders
    return {
      ...meta,
      totalYes: '0',
      totalNo: '0',
      impliedProbYes: 0.5,
      closeTimestamp: 0,
      hoursUntilClose: 0,
      totalLiquidityUsdc: '0',
    }
  }
}

export async function readAllMarketsLive(): Promise<MarketLive[]> {
  const meta = loadMarketsMeta()
  return Promise.all(meta.map(readMarketLive))
}
