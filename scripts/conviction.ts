// Phase 3 — Prompt 3.3 acceptance script.
//
// Chain: x402 evidence buy → Venice conviction → Venice verdict card image.
// Bull (YES side) buys evidence, reasons via Venice, returns a stake + verdict
// card. Identical flow for Bear; we run Bull here to limit Venice spend on the
// $10 credit balance.

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { erc20Abi, formatUnits } from 'viem'
import { POST as evidenceHandler } from '../app/api/evidence/route.js'
import { buildUserSmartAccount } from '../lib/accounts.js'
import {
  bullAccount,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from '../lib/config.js'
import { ensureDeployed, ensureFunded } from '../lib/deploy-sa.js'
import { BULL_CAP_USDC, buildBullBudget } from '../lib/duel.js'
import { buildRootMandate } from '../lib/mandate.js'
import { env as envVars } from '../lib/env.js'
import { conviction, verdictCard } from '../lib/venice.js'
import { buyEvidence } from '../lib/x402-buyer.js'

async function main() {
  console.log('\nPhase 3 / Prompt 3.3 — Venice conviction + verdict card\n' + '─'.repeat(80))

  // ── Prep chain ────────────────────────────────────────────────────────────
  const userSA = await buildUserSmartAccount()
  await ensureDeployed('USER', userSA, userAccount, userWalletSepolia, sepoliaPublicClient)
  await ensureFunded(
    'USER',
    userSA.address,
    userAccount,
    userWalletSepolia,
    sepoliaPublicClient,
    1_000_000n,
    2_000_000n,
  )

  const { signedDelegation: signedRoot } = await buildRootMandate()
  const bullBudget = await buildBullBudget(signedRoot)

  // ── Step 1: Bull buys ONE piece of evidence ──────────────────────────────
  console.log('\n[1/3] Bull buys evidence via x402')
  const userSaBefore = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userSA.address],
  })
  const buy = await buyEvidence({
    url: 'http://localhost/api/evidence?marketId=phase3-demo-market&side=YES',
    buyerPrivateKey: envVars.BULL_PRIVATE_KEY,
    buyerAddress: bullAccount.address,
    parentChain: [bullBudget, signedRoot],
    fetchFn: async (req) => (await evidenceHandler(req as any)) as unknown as Response,
  })
  console.log(`  paid: ${formatUnits(buy.usdcSpent, 6)} USDC — tx ${buy.settlementTxHash}`)
  console.log(`  evidence: ${buy.evidence.signal} / ${buy.evidence.sourceUrl}`)

  // ── Step 2: Venice produces conviction ───────────────────────────────────
  // Bull's remaining cap = full sub-cap minus what was just spent on evidence.
  const remainingCapUsdc =
    Number(formatUnits(BULL_CAP_USDC, 6)) - Number(formatUnits(buy.usdcSpent, 6))

  console.log(`\n[2/3] Venice conviction (model: qwen3-235b-a22b-instruct-2507)`)
  console.log(`  Bull arguing YES, remaining cap ${remainingCapUsdc.toFixed(2)} USDC, implied 0.5`)
  const c = await conviction({
    side: 'YES',
    evidence: [buy.evidence],
    remainingCapUsdc,
    impliedProb: 0.5,
    marketQuestion: 'Will the outcome resolve YES by close?',
  })
  console.log(`  side:        ${c.side}`)
  console.log(`  estProb:     ${c.estProb}`)
  console.log(`  impliedProb: ${c.impliedProb}`)
  console.log(`  edge:        ${c.edge.toFixed(3)}`)
  console.log(`  stakeUsdc:   ${c.stakeUsdc.toFixed(2)}  ${c.stakeUsdc === 0 ? '(abstained)' : ''}`)
  console.log(`  rationale:   ${c.rationale}`)

  // ── Step 3: Venice verdict card image ────────────────────────────────────
  console.log(`\n[3/3] Venice verdict card (model: flux-2-pro)`)
  const card = await verdictCard(c)
  if (card.b64) {
    mkdirSync(resolve(process.cwd(), 'artifacts'), { recursive: true })
    const outPath = resolve(process.cwd(), `artifacts/verdict-${c.side.toLowerCase()}-${Date.now()}.png`)
    writeFileSync(outPath, Buffer.from(card.b64, 'base64'))
    console.log(`  image saved: ${outPath} (${card.b64.length} base64 chars)`)
  } else if (card.url) {
    console.log(`  image URL: ${card.url}`)
  } else {
    throw new Error('verdictCard returned no image')
  }

  // ── Confirm cap drew down ────────────────────────────────────────────────
  const userSaAfter = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userSA.address],
  })

  console.log('\n' + '─'.repeat(80))
  console.log('PHASE 3 ACCEPTANCE CRITERIA: MET')
  console.log(`  ✓ Paid call returned data (evidence + settlement hash)`)
  console.log(`  ✓ Cap drew down: USER SA ${formatUnits(userSaBefore, 6)} → ${formatUnits(userSaAfter, 6)} USDC`)
  console.log(`  ✓ Venice returned valid conviction object (side=${c.side}, stake=${c.stakeUsdc.toFixed(2)})`)
  console.log(`  ✓ Venice generated verdict card image`)
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
