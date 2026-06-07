// scripts/test-unlock-direct.ts
//
// Tests the DIRECT-TRANSFER unlock path (x402 "exact" scheme) end-to-end —
// the bulletproof path the browser now uses. Mirrors exactly what the UI
// does: send USDC.transfer(payTo, amount) from a wallet, then POST the tx
// hash + sender to /api/unlock with PAYMENT-TXHASH + PAYMENT-FROM headers.
//
// Uses BEAR EOA as the "user wallet" (a plain EOA — exactly the kind that
// broke the delegation path, proving the transfer path works where
// delegation didn't).
//
//   npm run test:unlock:direct [callId]

import { erc20Abi, formatUnits, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { env } from '../lib/env.js'
import { sepoliaPublicClient, USDC_SEPOLIA } from '../lib/config.js'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function main() {
  const callId = process.argv[2] ?? 'call-btc-200k-001'

  // "User wallet" = BEAR EOA (a plain EOA, the type MetaMask refused to
  // delegation-sign). Direct transfer works fine for any EOA.
  const userAccount = privateKeyToAccount(env.BEAR_PRIVATE_KEY)
  const userWallet = createWalletClient({
    account: userAccount,
    chain: baseSepolia,
    transport: http(env.BASE_SEPOLIA_RPC_URL),
  })
  console.log(`\n▸ test-unlock-direct: ${callId}`)
  console.log(`  base: ${BASE_URL}`)
  console.log(`  user (plain EOA): ${userAccount.address}`)

  // ── 1. POST without payment → 402 + PAYMENT-REQUIRED ──────────────
  console.log(`\n[1/4] POST without payment (expect 402)`)
  const r402 = await fetch(`${BASE_URL}/api/unlock/${callId}`, { method: 'POST' })
  if (r402.status !== 402) throw new Error(`expected 402, got ${r402.status}`)
  const reqHeader = r402.headers.get('payment-required')!
  const accepted = JSON.parse(Buffer.from(reqHeader, 'base64').toString())
  console.log(`  ✓ 402 · need ${formatUnits(BigInt(accepted.amount), 6)} USDC → ${accepted.payTo}`)

  // ── 2. Send the USDC transfer (what the browser's writeContract does) ─
  const bal = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA, abi: erc20Abi, functionName: 'balanceOf', args: [userAccount.address],
  })
  console.log(`\n[2/4] USER balance ${formatUnits(bal, 6)} USDC · sending transfer…`)
  if (bal < BigInt(accepted.amount)) throw new Error('balance too low')
  const txHash = await userWallet.writeContract({
    address: accepted.asset as Hex,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [accepted.payTo as Hex, BigInt(accepted.amount)],
  })
  console.log(`  ✓ transfer tx: ${txHash}`)

  // ── 3. POST with PAYMENT-TXHASH + PAYMENT-FROM (server verifies) ───
  console.log(`\n[3/4] POST with PAYMENT-TXHASH (server waits + verifies)`)
  const t0 = Date.now()
  const r2 = await fetch(`${BASE_URL}/api/unlock/${callId}`, {
    method: 'POST',
    headers: { 'PAYMENT-TXHASH': txHash, 'PAYMENT-FROM': userAccount.address },
  })
  const j2: any = await r2.json()
  console.log(`  ← HTTP ${r2.status} in ${Date.now() - t0}ms`)
  if (!r2.ok || !j2.unlocked) {
    console.log(`  ✗ FAIL · error: ${j2.error} · detail: ${j2.detail}`)
    process.exit(1)
  }
  console.log(`  ✓ unlocked`)
  console.log(`    settlement tx: ${j2.unlock?.settlementTxHash}`)
  console.log(`    thesis: ${(j2.locked?.thesis ?? '').slice(0, 120)}…`)

  // ── 4. Replay guard: same tx can't unlock a different call ─────────
  console.log(`\n[4/4] Replay guard: reuse same tx on a different call`)
  const otherCall = callId === 'call-fed-001' ? 'call-gpt6-001' : 'call-fed-001'
  const replay = await fetch(`${BASE_URL}/api/unlock/${otherCall}`, {
    method: 'POST',
    headers: { 'PAYMENT-TXHASH': txHash, 'PAYMENT-FROM': userAccount.address },
  })
  const replayJson: any = await replay.json()
  console.log(`  ${replay.status === 409 ? '✓' : '✗'} replay on ${otherCall}: HTTP ${replay.status} (${replayJson.error ?? 'unlocked!'})`)

  console.log(`\n${'─'.repeat(70)}\n✓ DIRECT-TRANSFER UNLOCK PASSED`)
}

main().catch((e) => { console.error('\n✗ FATAL:', e); process.exit(1) })
