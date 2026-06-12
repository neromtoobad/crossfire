// Phase 4.2, typed access to the deployed BinaryMarket contract.
// ABI is intentionally minimal; we only use the methods CROSSFIRE needs.

import { parseAbi } from 'viem'
import { MARKET_ADDRESS, sepoliaPublicClient } from './config.js'

export const marketAbi = parseAbi([
  'function buy(bool isYes, uint256 usdcAmount) returns (uint256 sharesOut)',
  'function buyOnBehalf(address buyer, bool isYes, uint256 amount) returns (uint256 sharesOut)',
  'function positionOf(address) view returns (uint256 yes, uint256 no)',
  'function totals() view returns (uint256 totalYes, uint256 totalNo)',
  'function impliedProbYes() view returns (uint256)',
  'function lastSettledBalance() view returns (uint256)',
  'function closeTime() view returns (uint256)',
  'function question() view returns (string)',
  'event Buy(address indexed buyer, bool isYes, uint256 usdcAmount, uint256 sharesOut)',
  'event BuyOnBehalf(address indexed buyer, bool isYes, uint256 usdcAmount, uint256 sharesOut)',
])

export function getMarket(): `0x${string}` {
  if (!MARKET_ADDRESS) {
    throw new Error('MARKET_ADDRESS not set in env, deploy via `npm run deploy:market` first.')
  }
  return MARKET_ADDRESS
}

/** Read live implied P(YES) from the market, scaled 0–1. */
export async function readImpliedProbYes(): Promise<number> {
  const raw = await sepoliaPublicClient.readContract({
    address: getMarket(),
    abi: marketAbi,
    functionName: 'impliedProbYes',
  })
  return Number(raw) / 1e18
}

export async function readPosition(addr: `0x${string}`): Promise<{ yes: bigint; no: bigint }> {
  const [yes, no] = await sepoliaPublicClient.readContract({
    address: getMarket(),
    abi: marketAbi,
    functionName: 'positionOf',
    args: [addr],
  })
  return { yes, no }
}

export async function readTotals(): Promise<{ totalYes: bigint; totalNo: bigint }> {
  const [totalYes, totalNo] = await sepoliaPublicClient.readContract({
    address: getMarket(),
    abi: marketAbi,
    functionName: 'totals',
  })
  return { totalYes, totalNo }
}
