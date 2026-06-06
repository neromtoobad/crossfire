// Phase 7.2 — Deploy 4 themed BinaryMarkets so the landing has real cards
// for users to pick from. Each gets a small seed bet so the implied prob
// isn't always 0.5 (more realistic-looking grid).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { encodeFunctionData, erc20Abi, parseAbi, parseUnits, type Hex } from 'viem'
import {
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from '../lib/config.js'

type ForgeArtifact = { abi: any; bytecode: { object: `0x${string}` } }

const ART = JSON.parse(
  readFileSync(resolve(process.cwd(), 'contracts/out/BinaryMarket.sol/BinaryMarket.json'), 'utf8'),
) as ForgeArtifact

const SEVEN_DAYS = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60)

// ── The 4 questions a user picks from ────────────────────────────────────
// Phase 8.3: no longer pre-seed markets with biased positions. The
// previous seeds pushed impliedProbYes to 0% or 100%, leaving zero
// room for the council to find edge. Leaving impliedProbYes at the
// default 0.5 gives the council a fair canvas to disagree with.
const QUESTIONS = [
  {
    id: 'btc-200k-2026',
    title: 'Will Bitcoin hit $200,000 by Dec 31, 2026?',
    question: 'Will Bitcoin trade above $200,000 USD at any point before Dec 31, 2026?',
    closeTime: SEVEN_DAYS,
    seed: null,
  },
  {
    id: 'fed-rate-cut',
    title: 'Will the Fed cut rates at the next FOMC meeting?',
    question: 'Will the FOMC vote to cut the federal funds rate at the next scheduled meeting?',
    closeTime: SEVEN_DAYS,
    seed: null,
  },
  {
    id: 'trump-sbf-pardon',
    title: 'Will Trump pardon Sam Bankman-Fried?',
    question: 'Will President Trump issue a pardon for Sam Bankman-Fried in 2026?',
    closeTime: SEVEN_DAYS,
    seed: null,
  },
  {
    id: 'openai-gpt6-2026',
    title: 'Will OpenAI release GPT-6 in 2026?',
    question: 'Will OpenAI release a model branded as GPT-6 (or equivalent flagship) before Dec 31, 2026?',
    closeTime: SEVEN_DAYS,
    seed: null,
  },
] as Array<{
  id: string
  title: string
  question: string
  closeTime: bigint
  seed: { side: 'YES' | 'NO'; amountUsdc: bigint } | null
}>

const marketAbi = parseAbi([
  'function buy(bool isYes, uint256 usdcAmount) returns (uint256 sharesOut)',
  'function buyOnBehalf(address buyer, bool isYes, uint256 amount) returns (uint256 sharesOut)',
])

async function main() {
  console.log('\nPhase 7.2 — deploy 4 themed BinaryMarkets\n' + '─'.repeat(80))

  // Sanity: USER EOA needs ETH for deploys + USDC for seeds.
  const ethBal = await sepoliaPublicClient.getBalance({ address: userAccount.address })
  const usdcBal = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAccount.address],
  })
  console.log(`  USER EOA:  ${userAccount.address}`)
  console.log(`  ETH:       ${Number(ethBal) / 1e18} (need ~0.005 for 4 deploys)`)
  console.log(`  USDC:      ${Number(usdcBal) / 1e6} (need ~8 for seed bets)`)

  // Phase 8.3: most markets deploy without seeds. Sum only the ones that have one.
  const totalSeed = QUESTIONS.reduce((s, q) => s + (q.seed?.amountUsdc ?? 0n), 0n)
  if (usdcBal < totalSeed) {
    console.warn(`  ⚠ USER EOA only has ${Number(usdcBal) / 1e6} USDC; need ${Number(totalSeed) / 1e6} for seeds.`)
    console.warn(`    Markets will deploy but seeds may fail. Top up USER EOA's USDC if needed.`)
  }

  const deployed: Array<{
    id: string
    title: string
    question: string
    address: Hex
    deployTx: Hex
    closeTime: string
    seedSide: 'YES' | 'NO'
    seedAmountUsdc: string
    seedTransferTx?: Hex
    seedBuyOnBehalfTx?: Hex
  }> = []

  for (const q of QUESTIONS) {
    console.log(`\n  → ${q.id}: "${q.title}"`)

    // Deploy
    const hash = await userWalletSepolia.deployContract({
      abi: ART.abi,
      bytecode: ART.bytecode.object,
      args: [USDC_SEPOLIA, q.question, q.closeTime],
    })
    const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success' || !receipt.contractAddress) {
      throw new Error(`Deploy reverted for ${q.id}: ${hash}`)
    }
    const market = receipt.contractAddress as Hex
    console.log(`    deployed: ${market}  (tx ${hash.slice(0, 10)}…)`)

    let seedTransferTx: Hex | undefined
    let seedBuyOnBehalfTx: Hex | undefined

    if (q.seed) try {
      seedTransferTx = await userWalletSepolia.writeContract({
        address: USDC_SEPOLIA,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [market, q.seed.amountUsdc],
      })
      await sepoliaPublicClient.waitForTransactionReceipt({ hash: seedTransferTx })

      // Wait until the executing node sees the market's new balance.
      for (let i = 0; i < 8; i++) {
        const bal = await sepoliaPublicClient.readContract({
          address: USDC_SEPOLIA,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [market],
        })
        if (bal >= q.seed.amountUsdc) break
        await new Promise((r) => setTimeout(r, 1500))
      }

      seedBuyOnBehalfTx = await userWalletSepolia.writeContract({
        address: market,
        abi: marketAbi,
        functionName: 'buyOnBehalf',
        args: [userAccount.address, q.seed.side === 'YES', q.seed.amountUsdc],
      })
      await sepoliaPublicClient.waitForTransactionReceipt({ hash: seedBuyOnBehalfTx })
      console.log(`    seeded: ${q.seed.side} ${Number(q.seed.amountUsdc) / 1e6} USDC`)
    } catch (e) {
      console.warn(`    ⚠ seed failed: ${(e as Error).message.slice(0, 100)}`)
    }

    deployed.push({
      id: q.id,
      title: q.title,
      question: q.question,
      address: market,
      deployTx: hash,
      closeTime: new Date(Number(q.closeTime) * 1000).toISOString(),
      seedSide: q.seed?.side ?? 'NONE' as any,
      seedAmountUsdc: q.seed ? (Number(q.seed.amountUsdc) / 1e6).toString() : '0',
      seedTransferTx,
      seedBuyOnBehalfTx,
    })
  }

  // Write markets.json
  const out = resolve(process.cwd(), 'lib/markets.json')
  mkdirSync(resolve(process.cwd(), 'lib'), { recursive: true })
  writeFileSync(out, JSON.stringify({ deployedAt: new Date().toISOString(), markets: deployed }, null, 2))
  console.log(`\n  wrote ${out}`)

  console.log('\n' + '─'.repeat(80))
  console.log('NEXT:')
  console.log('  - lib/markets.json now lists all 4 markets')
  console.log('  - landing market grid reads this file (no env editing required)')
  console.log('  - the old MARKET_ADDRESS in .env.local still works for scripts/duel/proof')
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
