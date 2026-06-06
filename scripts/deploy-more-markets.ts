// Deploy 6 additional themed markets — sports + tech + crypto + macro spread.
// Appends to the existing lib/markets.json instead of overwriting (so the
// original 4 stay live + the council picker grows).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Hex } from 'viem'
import {
  sepoliaPublicClient,
  userAccount,
  userWalletSepolia,
} from '../lib/config.js'

type ForgeArtifact = { abi: any; bytecode: { object: `0x${string}` } }
const ART = JSON.parse(
  readFileSync(resolve(process.cwd(), 'contracts/out/BinaryMarket.sol/BinaryMarket.json'), 'utf8'),
) as ForgeArtifact

// All markets close 30 days out so seeds + council have room to find edge.
const THIRTY_DAYS = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60)

// Six new questions, intentionally varied:
//   sports  — three angles on the 2026 FIFA World Cup
//   crypto  — SOL flips ETH (cycle-risk narrative)
//   tech    — Apple foldable (long-tail product bet)
//   macro   — US 10y yield > 5% (rates regime)
const NEW_QUESTIONS = [
  {
    id: 'wc-argentina-2026',
    title: 'Will Argentina win the 2026 FIFA World Cup?',
    question: 'Will Argentina lift the trophy at the 2026 FIFA World Cup?',
    closeTime: THIRTY_DAYS,
  },
  {
    id: 'wc-messi-scores',
    title: 'Will Lionel Messi score at the 2026 World Cup?',
    question: 'Will Lionel Messi score a goal (open play or penalty) at the 2026 FIFA World Cup?',
    closeTime: THIRTY_DAYS,
  },
  {
    id: 'wc-final-penalties',
    title: 'Will the 2026 World Cup final go to penalties?',
    question: 'Will the 2026 FIFA World Cup final be decided by a penalty shootout?',
    closeTime: THIRTY_DAYS,
  },
  {
    id: 'sol-flip-eth-2026',
    title: 'Will Solana flip Ethereum on market cap in 2026?',
    question: 'Will Solana exceed Ethereum in market capitalization at any point in 2026?',
    closeTime: THIRTY_DAYS,
  },
  {
    id: 'apple-fold-2026',
    title: 'Will Apple ship a foldable iPhone in 2026?',
    question: 'Will Apple ship a foldable iPhone (any model, any region) before Dec 31, 2026?',
    closeTime: THIRTY_DAYS,
  },
  {
    id: 'us-10y-above-5',
    title: 'Will the US 10-year Treasury yield close above 5% in 2026?',
    question: 'Will the US 10-year Treasury yield close above 5.0% on any trading day in 2026?',
    closeTime: THIRTY_DAYS,
  },
]

async function main() {
  console.log('\nDeploying 6 additional markets on Base Sepolia\n' + '─'.repeat(80))

  // Load existing markets so we can append + skip already-deployed IDs.
  const out = resolve(process.cwd(), 'lib/markets.json')
  const existing = JSON.parse(readFileSync(out, 'utf8')) as {
    deployedAt: string
    markets: Array<{ id: string; address: Hex; [k: string]: any }>
  }
  const existingIds = new Set(existing.markets.map((m) => m.id))

  for (const q of NEW_QUESTIONS) {
    if (existingIds.has(q.id)) {
      console.log(`  · ${q.id} already deployed — skipping`)
      continue
    }
    console.log(`\n  → ${q.id}: "${q.title}"`)
    const hash = await userWalletSepolia.deployContract({
      abi: ART.abi,
      bytecode: ART.bytecode.object,
      args: [process.env.USDC_BASE_SEPOLIA, q.question, q.closeTime],
    })
    const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success' || !receipt.contractAddress) {
      throw new Error(`Deploy reverted for ${q.id}: ${hash}`)
    }
    const market = receipt.contractAddress as Hex
    console.log(`    deployed: ${market}  (tx ${hash.slice(0, 10)}…)`)

    existing.markets.push({
      id: q.id,
      title: q.title,
      question: q.question,
      address: market,
      deployTx: hash,
      closeTime: new Date(Number(q.closeTime) * 1000).toISOString(),
      seedSide: 'NONE',
      seedAmountUsdc: '0',
    })
  }

  existing.deployedAt = new Date().toISOString()
  writeFileSync(out, JSON.stringify(existing, null, 2))
  console.log(`\n  wrote ${out} · total markets now ${existing.markets.length}`)
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
