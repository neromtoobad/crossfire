// Phase 3 — exercise the x402 + ERC-7710 buyer end-to-end.
//
// Bull buys one piece of evidence. Real USDC moves from USER SA (through
// Bull's sub-budget chain) to the seller. Bull's remaining sub-cap shrinks.
//
// The test calls the Next.js POST handler directly (no `next dev` needed).

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
import { buildBullBudget } from '../lib/duel.js'
import { buildRootMandate } from '../lib/mandate.js'
import { env as envVars } from '../lib/env.js'
import { buyEvidence } from '../lib/x402-buyer.js'

async function main() {
  console.log('\nPhase 3 / Prompt 3.2 — x402 evidence buyer\n' + '─'.repeat(80))

  // ── Ensure USER SA is deployed + has USDC for settlement ─────────────────
  const userSA = await buildUserSmartAccount()
  await ensureDeployed('USER', userSA, userAccount, userWalletSepolia, sepoliaPublicClient)
  await ensureFunded(
    'USER',
    userSA.address,
    userAccount,
    userWalletSepolia,
    sepoliaPublicClient,
    1_000_000n, // need at least 1 USDC to cover 0.5 USDC settlements + headroom
    2_000_000n,
  )

  // ── Build the full chain Bull will redeem against ────────────────────────
  const { signedDelegation: signedRoot } = await buildRootMandate()
  const bullBudget = await buildBullBudget(signedRoot)
  console.log(`\nChain (leaf → root): open → bullBudget → root`)
  console.log(`  Buyer:       BULL EOA ${bullAccount.address}`)
  console.log(`  Sub-budget:  20 USDC under ORCH`)
  console.log(`  Root:        50 USDC under USER SA`)

  // ── Record balances before purchase ──────────────────────────────────────
  const userSaBefore = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userSA.address],
  })
  console.log(`\n  USER SA USDC before: ${formatUnits(userSaBefore, 6)}`)

  // ── Make the paid request via the route handler ──────────────────────────
  console.log('\n  POST /api/evidence?marketId=phase3-demo-market&side=YES')

  const result = await buyEvidence({
    url: 'http://localhost/api/evidence?marketId=phase3-demo-market&side=YES',
    buyerPrivateKey: envVars.BULL_PRIVATE_KEY,
    buyerAddress: bullAccount.address,
    parentChain: [bullBudget, signedRoot],
    fetchFn: async (req) => {
      // Direct route invocation — same code path Next.js would run.
      // NextRequest is structurally compatible with Request for our use.
      return (await evidenceHandler(req as any)) as unknown as Response
    },
  })

  // ── Record after, confirm the spend is metered on-chain ──────────────────
  // Public RPC nodes can serve stale state right after a receipt — retry
  // until the expected delta lands (or timeout).
  const expectedAfter = userSaBefore - result.usdcSpent
  let userSaAfter = userSaBefore
  for (let i = 0; i < 8; i++) {
    userSaAfter = await sepoliaPublicClient.readContract({
      address: USDC_SEPOLIA,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userSA.address],
    })
    if (userSaAfter <= expectedAfter) break
    await new Promise((r) => setTimeout(r, 1500))
  }
  const facilitatorAfter = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [result.facilitator],
  })

  console.log(`\n[evidence returned]`)
  console.log(`  marketId:  ${result.evidence.marketId}`)
  console.log(`  signal:    ${result.evidence.signal}`)
  console.log(`  sourceUrl: ${result.evidence.sourceUrl}`)
  console.log(`  weight:    ${result.evidence.weight}`)

  console.log(`\n[on-chain settlement]`)
  console.log(`  facilitator:       ${result.facilitator}`)
  console.log(`  USDC settled:      ${formatUnits(result.usdcSpent, 6)} USDC`)
  console.log(`  settlement tx:     ${result.settlementTxHash}`)
  console.log(`  https://sepolia.basescan.org/tx/${result.settlementTxHash}`)

  console.log(`\n[USDC balance deltas]`)
  console.log(`  USER SA before: ${formatUnits(userSaBefore, 6)}`)
  console.log(`  USER SA after:  ${formatUnits(userSaAfter, 6)}`)
  console.log(`  USER SA spent:  ${formatUnits(userSaBefore - userSaAfter, 6)} USDC ← metered on-chain`)
  console.log(`  facilitator now holds: ${formatUnits(facilitatorAfter, 6)} USDC`)

  if (userSaBefore - userSaAfter !== result.usdcSpent) {
    throw new Error(
      `Balance delta (${userSaBefore - userSaAfter}) != reported spent (${result.usdcSpent})`,
    )
  }
  console.log('\n✓ Phase 3 Prompt 3.2 — x402 buyer flow works; spend is metered on USER SA')
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
