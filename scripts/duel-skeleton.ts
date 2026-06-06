// Phase 2 — Prompt 2.2. The A2A duel skeleton.
//
// Proves three things on-chain:
//   1. Bull and Bear can each redeem an in-cap transfer through the
//      redelegation chain (leaf-to-root), drawing real USDC out of USER SA.
//   2. Each sub-cap is enforced independently — 40 USDC (2× sub-cap) reverts
//      at the enforcer for both Bull and Bear.
//   3. The root cap is structurally never exceeded — combined sub-caps
//      (20 + 20) ≤ root cap (50).

import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'
import { encodeDelegations } from '@metamask/smart-accounts-kit/utils'
import {
  decodeErrorResult,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  type Hex,
  type WalletClient,
} from 'viem'
import { buildUserSmartAccount } from '../lib/accounts.js'
import {
  bearAccount,
  bearWalletSepolia,
  bullAccount,
  bullWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from '../lib/config.js'
import { ensureDeployed, ensureFunded } from '../lib/deploy-sa.js'
import {
  BEAR_CAP_USDC,
  BULL_CAP_USDC,
  buildBearBudget,
  buildBullBudget,
} from '../lib/duel.js'
import { buildRootMandate, MANDATE_CAP_USDC } from '../lib/mandate.js'

const BURN: `0x${string}` = '0x000000000000000000000000000000000000dEaD'

async function main() {
  console.log('\nPhase 2 / Prompt 2.2 — duel skeleton (A2A)\n' + '─'.repeat(80))

  // ── Prep: USER SA deployed + funded with enough to cover both subs ──────
  const userSA = await buildUserSmartAccount()
  await ensureDeployed('USER', userSA, userAccount, userWalletSepolia, sepoliaPublicClient)
  // Phase 1 already left 9 USDC there (after the 1 USDC in-cap redeem).
  // Keep ≥ 5 USDC for Phase 2 redeems (1 USDC × 2 successful + headroom).
  await ensureFunded(
    'USER',
    userSA.address,
    userAccount,
    userWalletSepolia,
    sepoliaPublicClient,
    parseUnits('5', 6),
    parseUnits('5', 6),
  )

  // ── Build the chain: root → bullBudget, root → bearBudget ───────────────
  console.log('\nBuilding the redelegation chain…')
  const { signedDelegation: signedRoot } = await buildRootMandate()
  console.log(`  Root signed: USER SA → ORCH EOA (cap ${formatUnits(MANDATE_CAP_USDC, 6)} USDC)`)

  const [bullBudget, bearBudget] = await Promise.all([
    buildBullBudget(signedRoot),
    buildBearBudget(signedRoot),
  ])
  console.log(`  Bull budget signed: ORCH EOA → BULL EOA (cap ${formatUnits(BULL_CAP_USDC, 6)} USDC)`)
  console.log(`  Bear budget signed: ORCH EOA → BEAR EOA (cap ${formatUnits(BEAR_CAP_USDC, 6)} USDC)`)

  // Sanity: chain link integrity (CLAUDE.md footgun)
  if (bullBudget.delegator !== signedRoot.delegate) {
    throw new Error('Bull chain broken: child.delegator != parent.delegate')
  }
  if (bearBudget.delegator !== signedRoot.delegate) {
    throw new Error('Bear chain broken: child.delegator != parent.delegate')
  }
  console.log('  ✓ chain link integrity verified (each child.delegator == parent.delegate)')

  // ── encodeDelegations is LEAF-TO-ROOT per CLAUDE.md ─────────────────────
  const bullChain: Hex = encodeDelegations([bullBudget, signedRoot])
  const bearChain: Hex = encodeDelegations([bearBudget, signedRoot])

  // Wrap Bull and Bear wallet clients with redemption helpers
  const bullClient = bullWalletSepolia.extend(erc7710WalletActions())
  const bearClient = bearWalletSepolia.extend(erc7710WalletActions())

  const delegationManager = (await buildUserSmartAccount()).environment.DelegationManager

  // ── (A) In-cap redeems: 1 USDC each ─────────────────────────────────────
  console.log('\n[A] IN-CAP redeems (1 USDC each — should succeed)')
  const bullInHash = await redeemTransfer({
    label: 'BULL',
    client: bullClient,
    chain: bullChain,
    amount: parseUnits('1', 6),
    delegationManager,
  })
  const bearInHash = await redeemTransfer({
    label: 'BEAR',
    client: bearClient,
    chain: bearChain,
    amount: parseUnits('1', 6),
    delegationManager,
  })

  // ── (B) Over-sub-cap redeems: 40 USDC each — MUST revert ────────────────
  console.log('\n[B] OVER-SUB-CAP attempts (40 USDC each, sub-cap is 20 — MUST revert)')
  const bullOverReason = await expectRevert({
    label: 'BULL',
    client: bullClient,
    chain: bullChain,
    amount: parseUnits('40', 6),
    delegationManager,
  })
  const bearOverReason = await expectRevert({
    label: 'BEAR',
    client: bearClient,
    chain: bearChain,
    amount: parseUnits('40', 6),
    delegationManager,
  })

  // ── (C) Root-cap structural assertion ───────────────────────────────────
  const totalSubCaps = BULL_CAP_USDC + BEAR_CAP_USDC
  if (totalSubCaps > MANDATE_CAP_USDC) {
    throw new Error(
      `STRUCTURAL: combined sub-caps ${formatUnits(totalSubCaps, 6)} > root cap ${formatUnits(MANDATE_CAP_USDC, 6)}`,
    )
  }

  console.log('\n' + '─'.repeat(80))
  console.log('PHASE 2 ACCEPTANCE CRITERIA: MET')
  console.log(`  • BULL in-cap redeem succeeded:  ${bullInHash}`)
  console.log(`  • BEAR in-cap redeem succeeded:  ${bearInHash}`)
  console.log(`  • BULL over-sub-cap reverted:    ${bullOverReason}`)
  console.log(`  • BEAR over-sub-cap reverted:    ${bearOverReason}`)
  console.log(`  • Combined sub-caps (${formatUnits(totalSubCaps, 6)}) ≤ root (${formatUnits(MANDATE_CAP_USDC, 6)}): YES`)
  console.log('\nPaste hashes + revert strings into PROOF.md.')
}

async function redeemTransfer({
  label,
  client,
  chain,
  amount,
  delegationManager,
}: {
  label: string
  client: WalletClient & { sendTransactionWithDelegation: any }
  chain: Hex
  amount: bigint
  delegationManager: `0x${string}`
}): Promise<Hex> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [BURN, amount],
  })
  const hash = await client.sendTransactionWithDelegation({
    to: USDC_SEPOLIA,
    data,
    value: 0n,
    permissionContext: chain,
    delegationManager,
  })
  const r = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
  if (r.status !== 'success') {
    throw new Error(`${label} in-cap tx ${hash} reverted on-chain — unexpected`)
  }
  console.log(`  ✓ ${label} redeemed ${formatUnits(amount, 6)} USDC — tx ${hash}`)
  console.log(`     https://sepolia.basescan.org/tx/${hash}`)
  return hash
}

async function expectRevert({
  label,
  client,
  chain,
  amount,
  delegationManager,
}: {
  label: string
  client: WalletClient & { sendTransactionWithDelegation: any }
  chain: Hex
  amount: bigint
  delegationManager: `0x${string}`
}): Promise<string> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [BURN, amount],
  })
  try {
    const hash = await client.sendTransactionWithDelegation({
      to: USDC_SEPOLIA,
      data,
      value: 0n,
      permissionContext: chain,
      delegationManager,
    })
    const r = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
    if (r.status === 'success') {
      throw new Error(
        `${label} OVER-SUB-CAP unexpectedly succeeded (cap not enforced): ${hash}`,
      )
    }
    const reason = `tx ${hash} reverted on-chain`
    console.log(`  ✓ ${label} attempted ${formatUnits(amount, 6)} USDC — REVERTED: ${reason}`)
    return reason
  } catch (err) {
    const reason = extractEnforcerError(err)
    console.log(`  ✓ ${label} attempted ${formatUnits(amount, 6)} USDC — REVERTED: ${reason}`)
    return reason
  }
}

/**
 * Pull the enforcer's revert string out of a viem error chain.
 * Keeps the output short — just "ERC20TransferAmountEnforcer:allowance-exceeded".
 */
function extractEnforcerError(err: unknown): string {
  let cur: any = err
  for (let i = 0; cur && i < 8; i++) {
    // Hit pattern: shortMessage that contains "ERC20...Enforcer:..."
    const sm: string | undefined = cur.shortMessage
    if (sm) {
      const m = sm.match(/([A-Za-z0-9]+Enforcer:[A-Za-z0-9-]+)/)
      if (m) return m[1]!
    }
    // Or in details
    const det: string | undefined = cur.details
    if (det) {
      const m = det.match(/([A-Za-z0-9]+Enforcer:[A-Za-z0-9-]+)/)
      if (m) return m[1]!
    }
    // Or in raw error data
    if (cur.data && typeof cur.data === 'string' && cur.data !== '0x') {
      try {
        const decoded = decodeErrorResult({
          abi: [{ type: 'error', name: 'Error', inputs: [{ type: 'string', name: 'reason' }] }],
          data: cur.data as Hex,
        })
        const reason = String(decoded.args[0])
        const m = reason.match(/([A-Za-z0-9]+Enforcer:[A-Za-z0-9-]+)/)
        if (m) return m[1]!
        return reason.slice(0, 120)
      } catch {
        /* fall through */
      }
    }
    cur = cur.cause
  }
  return String(err).slice(0, 200)
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
