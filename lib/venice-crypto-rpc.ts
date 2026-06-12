// Venice Crypto RPC, a pay-per-call multi-chain JSON-RPC proxy Venice exposes
// at POST /api/v1/crypto/rpc/{network}. Same shape as Alchemy/Infura. We use it
// to pull LIVE on-chain context for a market right before the forecasters reason,
// so their calls are anchored to real chain state, fetched through Venice, not a
// third-party node. (Recommendation #3, verified live: 23 networks incl. base.)
//
// Auth: Bearer VENICE_API_KEY today; the same endpoint accepts SIWE/x402 once the
// wallet path is funded, so this becomes another wallet-paid Venice call.

import { env } from './env.js'

const BASE = 'https://api.venice.ai/api/v1/crypto/rpc'

export type RpcNetwork =
  | 'base-mainnet' | 'base-sepolia'
  | 'ethereum-mainnet' | 'ethereum-sepolia'
  | 'arbitrum-mainnet' | 'optimism-mainnet' | 'polygon-mainnet'

/** One JSON-RPC 2.0 call routed through Venice's proxy. */
export async function cryptoRpc<T = unknown>(
  network: RpcNetwork,
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const res = await fetch(`${BASE}/${network}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })
  if (!res.ok) throw new Error(`Venice crypto RPC ${method} → HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`Venice crypto RPC ${method} → ${JSON.stringify(json.error)}`)
  return json.result as T
}

/** Live chain context for a market, block height + gas, fetched via Venice. */
export type ChainContext = {
  network: RpcNetwork
  chainId: number
  blockNumber: number
  gasGwei: number
  fetchedAt: number
}

export async function chainContext(network: RpcNetwork = 'base-mainnet'): Promise<ChainContext | null> {
  try {
    const [chainHex, blockHex, gasHex] = await Promise.all([
      cryptoRpc<string>(network, 'eth_chainId'),
      cryptoRpc<string>(network, 'eth_blockNumber'),
      cryptoRpc<string>(network, 'eth_gasPrice'),
    ])
    return {
      network,
      chainId: parseInt(chainHex, 16),
      blockNumber: parseInt(blockHex, 16),
      gasGwei: Math.round((parseInt(gasHex, 16) / 1e9) * 1000) / 1000,
      fetchedAt: Date.now(),
    }
  } catch {
    return null // never block the forecasters on a context fetch
  }
}

/**
 * Read a Chainlink-style price feed (latestRoundData → answer) via Venice RPC.
 * Pass the feed contract + decimals for the market's underlying. Returns the
 * live price, anchored to a real on-chain oracle, pulled through Venice.
 * latestRoundData() selector = 0xfeaf968c; answer is the 2nd 32-byte word.
 */
export async function readPriceFeed(
  feed: `0x${string}`,
  decimals = 8,
  network: RpcNetwork = 'base-mainnet',
): Promise<number | null> {
  try {
    const data = await cryptoRpc<string>(network, 'eth_call', [
      { to: feed, data: '0xfeaf968c' }, // latestRoundData()
      'latest',
    ])
    // words: roundId, answer, startedAt, updatedAt, answeredInRound
    const answerHex = '0x' + data.slice(2 + 64, 2 + 128)
    const answer = BigInt(answerHex)
    return Number(answer) / 10 ** decimals
  } catch {
    return null
  }
}
