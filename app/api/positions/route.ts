// GET /api/positions?user=0x... — returns the connected user's positions
// across all 4 themed markets, read live from the chain.

import { NextResponse, type NextRequest } from 'next/server'
import { erc20Abi, formatUnits } from 'viem'
import { sepoliaPublicClient, USDC_SEPOLIA } from '../../../lib/config.js'
import { loadMarketsMeta } from '../../../lib/markets-data.js'
import { marketAbi } from '../../../lib/market.js'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const user = url.searchParams.get('user')
  if (!user || !/^0x[0-9a-fA-F]{40}$/.test(user)) {
    return NextResponse.json({ ok: false, error: 'user query param required' }, { status: 400 })
  }
  const userAddr = user as `0x${string}`

  const meta = loadMarketsMeta()
  const results = await Promise.all(
    meta.map(async (m) => {
      try {
        const [pos, totals, impl] = await Promise.all([
          sepoliaPublicClient.readContract({
            address: m.address,
            abi: marketAbi,
            functionName: 'positionOf',
            args: [userAddr],
          }) as Promise<readonly [bigint, bigint]>,
          sepoliaPublicClient.readContract({
            address: m.address,
            abi: marketAbi,
            functionName: 'totals',
          }) as Promise<readonly [bigint, bigint]>,
          sepoliaPublicClient.readContract({
            address: m.address,
            abi: marketAbi,
            functionName: 'impliedProbYes',
          }) as Promise<bigint>,
        ])
        return {
          marketId: m.id,
          title: m.title,
          address: m.address,
          yes: formatUnits(pos[0], 6),
          no: formatUnits(pos[1], 6),
          totalYes: formatUnits(totals[0], 6),
          totalNo: formatUnits(totals[1], 6),
          impliedProbYes: Number(impl) / 1e18,
          hasPosition: pos[0] > 0n || pos[1] > 0n,
        }
      } catch {
        return {
          marketId: m.id,
          title: m.title,
          address: m.address,
          yes: '0', no: '0', totalYes: '0', totalNo: '0', impliedProbYes: 0.5,
          hasPosition: false,
        }
      }
    }),
  )

  // Also return user's USDC balance for context
  let usdcBal = '0'
  try {
    const b = await sepoliaPublicClient.readContract({
      address: USDC_SEPOLIA, abi: erc20Abi, functionName: 'balanceOf', args: [userAddr],
    }) as bigint
    usdcBal = formatUnits(b, 6)
  } catch {}

  return NextResponse.json({ ok: true, positions: results, usdcBalance: usdcBal })
}
