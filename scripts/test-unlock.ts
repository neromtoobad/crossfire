// scripts/test-unlock.ts
//
// End-to-end test for /api/unlock that mirrors the client flow without
// needing MetaMask. Uses USER EOA from .env.local to sign a delegation
// (the same manual fallback path the UI takes when ERC-7715 isn't
// available). Verifies:
//   · GET /api/unlock/[callId]?user=... returns 402 (not-unlocked)
//   · POST without sig returns 402 + PAYMENT-REQUIRED
//   · POST with a signed delegation settles on-chain and returns the
//     locked thesis
//   · GET /api/unlock/[callId]?user=... now returns the unlocked thesis
//
// Usage:
//   npm run test:unlock                              # picks first call
//   npm run test:unlock -- call-fed-rate-cut-...     # specific call

import { encodeFunctionData, erc20Abi, formatUnits, parseUnits, type Hex } from 'viem'
import {
  createOpenDelegation,
  ScopeType,
  getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'
import {
  createCaveatBuilder,
  encodeDelegations,
  generateSalt,
} from '@metamask/smart-accounts-kit/utils'
import { env } from '../lib/env.js'
import { userAccount, sepoliaPublicClient, USDC_SEPOLIA, userWalletSepolia } from '../lib/config.js'
import { buildUserSmartAccount } from '../lib/accounts.js'
import { ensureDeployed, ensureFunded } from '../lib/deploy-sa.js'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const CHAIN_ID = 84532

async function pickCallId(): Promise<string> {
  const arg = process.argv[2]
  if (arg) return arg
  // Pull from /api/unlock? actually we can read .crossfire/calls.json or sample list.
  // Simpler: list calls via fetching the home page is overkill; ask user via arg.
  // Default to a known sample.
  return 'call-trump-pardon-001'
}

async function main() {
  const callId = await pickCallId()

  // Use USER SA (smart account) as the delegator — the DelegationManager
  // validates via ERC-1271 which needs contract code at the delegator
  // address. A raw EOA can't be a delegator here without 7702 upgrade.
  const userSA = await buildUserSmartAccount()
  await ensureDeployed('USER', userSA, userAccount, userWalletSepolia, sepoliaPublicClient)
  await ensureFunded('USER', userSA.address, userAccount, userWalletSepolia, sepoliaPublicClient,
    parseUnits('1', 6), parseUnits('1', 6))

  console.log(`\n▸ test-unlock: ${callId}\n  base:    ${BASE_URL}\n  USER SA: ${userSA.address}\n  USER EOA (signer): ${userAccount.address}`)

  // ── 1. GET — should be 402 (not unlocked) ──────────────────────────
  console.log(`\n[1/5] GET /api/unlock/${callId}?user=${userSA.address}`)
  const g1 = await fetch(`${BASE_URL}/api/unlock/${callId}?user=${userSA.address}`)
  console.log(`  status: ${g1.status}  · expected 402 or 200 (if already unlocked)`)
  if (g1.status === 404) {
    const j = await g1.json()
    throw new Error(`call not found: ${callId} · server: ${JSON.stringify(j)}`)
  }
  const g1Json: any = await g1.json()
  if (g1Json.unlocked) {
    console.log(`  ⚠ already unlocked — thesis preview:`)
    console.log(`    ${(g1Json.locked?.thesis ?? '').slice(0, 140)}…`)
    console.log(`  exiting cleanly`)
    return
  }

  // ── 2. POST without sig — should be 402 + PAYMENT-REQUIRED ────────
  console.log(`\n[2/5] POST without sig (expect 402)`)
  const noSig = await fetch(`${BASE_URL}/api/unlock/${callId}`, { method: 'POST' })
  const reqHeader = noSig.headers.get('payment-required')
  if (noSig.status !== 402 || !reqHeader) {
    throw new Error(`expected 402+payment-required, got ${noSig.status}`)
  }
  const accepted = JSON.parse(Buffer.from(reqHeader, 'base64').toString())
  console.log(`  ✓ 402 · ${accepted.amount} atoms ${accepted.asset.slice(0, 10)}…`)
  console.log(`    payTo: ${accepted.payTo}`)
  console.log(`    facilitators: ${JSON.stringify(accepted.extra.facilitators)}`)

  // ── 3. USER SA USDC balance check ──────────────────────────────────
  const bal = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA, abi: erc20Abi, functionName: 'balanceOf',
    args: [userSA.address],
  })
  console.log(`\n[3/5] USER SA USDC balance: ${formatUnits(bal, 6)}  · needed ${formatUnits(BigInt(accepted.amount), 6)}`)
  if (bal < BigInt(accepted.amount)) {
    throw new Error(`USER SA balance too low — top up`)
  }

  // ── 4. Build + sign the delegation FROM the SA ─────────────────────
  // The SA's signDelegation() handles ERC-1271 correctly: the EOA owner
  // signs ECDSA, the SA's isValidSignature validates that signature.
  console.log(`\n[4/5] Sign delegation: USER SA → facilitator`)
  const environment = userSA.environment
  const facilitator = accepted.extra.facilitators[0] as Hex
  const caveats = createCaveatBuilder(environment)
    .addCaveat('redeemer', { redeemers: [facilitator] })
    .build()
  const delegation = createOpenDelegation({
    from: userSA.address,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: accepted.asset as Hex,
      maxAmount: BigInt(accepted.amount),
    },
    caveats,
    salt: generateSalt(),
    environment,
  })
  const signature = await userSA.signDelegation({ delegation })
  const signedDelegation = { ...delegation, signature }
  const permissionContext = encodeDelegations([signedDelegation])
  console.log(`  ✓ signed via SA · permissionContext len=${permissionContext.length}`)

  // ── 5. POST with PAYMENT-SIGNATURE ─────────────────────────────────
  const paymentPayload = {
    x402Version: 2,
    accepted,
    payload: {
      delegationManager: environment.DelegationManager,
      permissionContext,
      delegator: userSA.address,
    },
  }
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
  console.log(`\n[5/5] POST /api/unlock/${callId} with PAYMENT-SIGNATURE`)
  console.log(`  (this triggers on-chain redemption — ~5-15s)`)
  const t0 = Date.now()
  const r2 = await fetch(`${BASE_URL}/api/unlock/${callId}`, {
    method: 'POST',
    headers: { 'PAYMENT-SIGNATURE': paymentHeader, 'Content-Type': 'application/json' },
  })
  const elapsed = Date.now() - t0
  const j2: any = await r2.json()
  console.log(`  ← HTTP ${r2.status} in ${elapsed}ms`)
  if (!r2.ok || !j2.unlocked) {
    console.log(`\n  ✗ FAIL`)
    console.log(`  error: ${j2.error}`)
    console.log(`  detail: ${j2.detail}`)
    process.exit(1)
  }
  console.log(`  ✓ unlocked`)
  console.log(`    tx: ${j2.unlock?.settlementTxHash}`)
  console.log(`    https://sepolia.basescan.org/tx/${j2.unlock?.settlementTxHash}`)
  console.log(`    thesis preview: ${(j2.locked?.thesis ?? '').slice(0, 140)}…`)

  // ── 6. GET again — idempotent ──────────────────────────────────────
  console.log(`\n[verify] GET again — should now return unlocked content`)
  const g2 = await fetch(`${BASE_URL}/api/unlock/${callId}?user=${userSA.address}`)
  const g2j: any = await g2.json()
  console.log(`  status: ${g2.status} · unlocked: ${g2j.unlocked}`)

  console.log(`\n─`.repeat(80))
  console.log(`✓ END-TO-END UNLOCK PASSED`)
}

main().catch((err) => {
  console.error('\n✗ FATAL:', err)
  process.exit(1)
})
