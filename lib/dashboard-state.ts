// Server-side composer for the dashboard. Pulls real on-chain state +
// duel snapshots + relayer events into a single typed object the page
// component renders. No fabricated data: every field comes from a chain
// call, a persisted JSON file, or the env config.

import { erc20Abi, formatUnits, formatEther } from 'viem'
import {
  bearAccount,
  bullAccount,
  MARKET_ADDRESS,
  orchestratorAccount,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
} from './config.js'
import { buildUserSmartAccount } from './accounts.js'
import { isDeployed } from './accounts.js'
import { marketAbi } from './market.js'
import { readState, type AppState } from './relayer-state.js'

export type DashboardData = {
  generatedAt: number
  network: 'base-sepolia'
  addresses: {
    user: { eoa: string; sa: string; saDeployed: boolean }
    orch: { eoa: string }
    bull: { eoa: string }
    bear: { eoa: string }
    usdc: string
    market: string | null
  }
  balances: {
    userSaUsdc: string
    orchEoaUsdc: string
    bullEoaUsdc: string
    bearEoaUsdc: string
    userSaEth: string
  }
  mandate: {
    rootCap: string       // 50.00 USDC
    bullCap: string       // 20.00 USDC
    bearCap: string       // 20.00 USDC
    note: string
  }
  market: {
    address: string | null
    totalYes: string
    totalNo: string
    impliedProb: number
    userSaPosition: { yes: string; no: string }
    question: string | null
    closeTime: string | null
  } | null
  latestDuel: AppState['duels'][number] | null
  recentDuels: AppState['duels']
  relayerEvents: AppState['relayerEvents']
  latestRelayDispatch: AppState['latestRelayDispatch']
}

async function readUsdc(addr: `0x${string}`): Promise<bigint> {
  return sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [addr],
  })
}

export async function loadDashboard(): Promise<DashboardData> {
  const userSA = await buildUserSmartAccount()

  const [
    saDeployed,
    userSaUsdc,
    orchEoaUsdc,
    bullEoaUsdc,
    bearEoaUsdc,
    userSaEth,
  ] = await Promise.all([
    isDeployed(sepoliaPublicClient, userSA.address),
    readUsdc(userSA.address),
    readUsdc(orchestratorAccount.address),
    readUsdc(bullAccount.address),
    readUsdc(bearAccount.address),
    sepoliaPublicClient.getBalance({ address: userSA.address }),
  ])

  let market: DashboardData['market'] = null
  if (MARKET_ADDRESS) {
    try {
      const [totals, userPos, impl, q, ct] = await Promise.all([
        sepoliaPublicClient.readContract({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: 'totals',
        }) as Promise<readonly [bigint, bigint]>,
        sepoliaPublicClient.readContract({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: 'positionOf',
          args: [userSA.address],
        }) as Promise<readonly [bigint, bigint]>,
        sepoliaPublicClient.readContract({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: 'impliedProbYes',
        }) as Promise<bigint>,
        sepoliaPublicClient.readContract({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: 'question',
        }) as Promise<string>,
        sepoliaPublicClient.readContract({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: 'closeTime',
        }) as Promise<bigint>,
      ])
      market = {
        address: MARKET_ADDRESS,
        totalYes: formatUnits(totals[0], 6),
        totalNo: formatUnits(totals[1], 6),
        impliedProb: Number(impl) / 1e18,
        userSaPosition: { yes: formatUnits(userPos[0], 6), no: formatUnits(userPos[1], 6) },
        question: q,
        closeTime: new Date(Number(ct) * 1000).toISOString(),
      }
    } catch {
      market = { address: MARKET_ADDRESS, totalYes: '?', totalNo: '?', impliedProb: 0, userSaPosition: { yes: '?', no: '?' }, question: null, closeTime: null }
    }
  }

  const state = readState()
  const latestDuel = state.duels[0] ?? null

  return {
    generatedAt: Date.now(),
    network: 'base-sepolia',
    addresses: {
      user: { eoa: userAccount.address, sa: userSA.address, saDeployed },
      orch: { eoa: orchestratorAccount.address },
      bull: { eoa: bullAccount.address },
      bear: { eoa: bearAccount.address },
      usdc: USDC_SEPOLIA,
      market: MARKET_ADDRESS ?? null,
    },
    balances: {
      userSaUsdc: formatUnits(userSaUsdc, 6),
      orchEoaUsdc: formatUnits(orchEoaUsdc, 6),
      bullEoaUsdc: formatUnits(bullEoaUsdc, 6),
      bearEoaUsdc: formatUnits(bearEoaUsdc, 6),
      userSaEth: formatEther(userSaEth),
    },
    mandate: {
      rootCap: '50.00',
      bullCap: '20.00',
      bearCap: '20.00',
      note: 'Cap per signing — fresh salt on each run resets on-chain counters.',
    },
    market,
    latestDuel,
    recentDuels: state.duels.slice(0, 5),
    relayerEvents: state.relayerEvents.slice(0, 10),
    latestRelayDispatch: state.latestRelayDispatch,
  }
}
