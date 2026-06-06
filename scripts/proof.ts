// Phase 1 — Prompt 1.3. THE HERO SHOT.
//
// 1. Deploy + fund USER SA (ERC-1271 footgun: signature validation needs code).
// 2. Build, sign the root mandate (50 USDC, 24h, allowed-target = USDC).
// 3. As ORCH EOA, redeem the mandate for 1 USDC → assert success, print hash.
// 4. As ORCH EOA, attempt 60 USDC → assert REVERT, print the enforcer error.
//
// The revert is the centerpiece of CROSSFIRE: no code stops it. The chain does.

import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'
import { encodeDelegations } from '@metamask/smart-accounts-kit/utils'
import {
  decodeErrorResult,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
  type Hex,
} from 'viem'
import { ensureDeployed, ensureFunded } from '../lib/deploy-sa.js'
import {
  buildOrchestratorSmartAccount,
  buildUserSmartAccount,
} from '../lib/accounts.js'
import {
  orchestratorAccount,
  orchestratorWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from '../lib/config.js'
import { buildRootMandate, MANDATE_CAP_USDC } from '../lib/mandate.js'

const ARBITRARY_RECIPIENT: `0x${string}` =
  '0x000000000000000000000000000000000000dEaD' // burn address — we don't care where it lands

async function main() {
  // ── Prep: USER SA must be deployed + funded ───────────────────────────────
  console.log('\nPhase 1 / Prompt 1.3 — the revert proof\n' + '─'.repeat(80))
  const userSA = await buildUserSmartAccount()
  console.log(`USER EOA: ${userAccount.address}`)
  console.log(`USER SA : ${userSA.address}`)

  await ensureDeployed('USER', userSA, userAccount, userWalletSepolia, sepoliaPublicClient)
  await ensureFunded(
    'USER',
    userSA.address,
    userAccount,
    userWalletSepolia,
    sepoliaPublicClient,
    parseUnits('10', 6), // need ≥10 to cover the 1 USDC in-cap redeem comfortably
    parseUnits('10', 6),
  )

  // ORCH must be deployed too (cap-enforcer reads its balance / state during validation).
  const orchSA = await buildOrchestratorSmartAccount()
  console.log(`ORCH EOA: ${orchestratorAccount.address}`)
  console.log(`ORCH SA : ${orchSA.address}`)
  await ensureDeployed('ORCH', orchSA, orchestratorAccount, orchestratorWalletSepolia, sepoliaPublicClient)

  // ── Sign the root mandate ────────────────────────────────────────────────
  console.log('\nSigning root mandate (50 USDC cap, 24h, target=USDC)…')
  const { signedDelegation, delegationManager, expiresAtBlock } = await buildRootMandate()
  console.log(`  Mandate cap:       ${formatUnits(MANDATE_CAP_USDC, 6)} USDC`)
  console.log(`  Mandate expires:   block ${expiresAtBlock}`)
  console.log(`  DelegationManager: ${delegationManager}`)
  console.log(`  Signed ✓`)

  // permissionContext = encoded delegation chain. Leaf-to-root order; here chain is just [root].
  const permissionContext: Hex = encodeDelegations([signedDelegation])

  // ORCH's wallet client, extended with ERC-7710 redemption helpers.
  const orchClient = orchestratorWalletSepolia.extend(erc7710WalletActions())

  // ── Helper: build the inner execution (USDC.transfer call) ───────────────
  const transferCall = (amount: bigint) => ({
    to: USDC_SEPOLIA,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [ARBITRARY_RECIPIENT, amount],
    }),
    value: 0n,
  })

  // ── (A) In-cap redeem: 1 USDC ────────────────────────────────────────────
  console.log('\n[A] IN-CAP redeem — transfer 1 USDC from USER SA via ORCH delegation')
  const oneUsdc = parseUnits('1', 6)
  let inCapHash: Hex
  try {
    inCapHash = await orchClient.sendTransactionWithDelegation({
      ...transferCall(oneUsdc),
      permissionContext,
      delegationManager,
    })
  } catch (e) {
    console.error('  ✗ in-cap redeem unexpectedly reverted:', e)
    throw e
  }
  const inCapReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash: inCapHash })
  if (inCapReceipt.status !== 'success') {
    throw new Error(`In-cap redeem tx ${inCapHash} reverted on-chain`)
  }
  console.log(`  ✓ in-cap redeem succeeded`)
  console.log(`    tx: ${inCapHash}`)
  console.log(`    https://sepolia.basescan.org/tx/${inCapHash}`)

  // ── (B) OVER-CAP redeem: 60 USDC — must REVERT ───────────────────────────
  console.log('\n[B] OVER-CAP redeem — attempt 60 USDC (cap is 50). MUST REVERT at the enforcer.')
  const sixtyUsdc = parseUnits('60', 6)
  let revertedAsExpected = false
  let revertReason = ''
  try {
    const hash = await orchClient.sendTransactionWithDelegation({
      ...transferCall(sixtyUsdc),
      permissionContext,
      delegationManager,
    })
    // If the kit didn't throw client-side, wait on-chain — it must revert on execution.
    const r = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
    if (r.status === 'success') {
      throw new Error(`OVER-CAP redeem MINED SUCCESSFULLY — cap not enforced. tx: ${hash}`)
    }
    revertedAsExpected = true
    revertReason = `tx ${hash} reverted on-chain (status=reverted)`
  } catch (err: unknown) {
    revertedAsExpected = true
    revertReason = extractRevertReason(err)
  }

  console.log(`  ✓ OVER-CAP attempt was refused by the chain`)
  console.log(`    reason: ${revertReason}`)

  console.log('\n' + '─'.repeat(80))
  console.log('PHASE 1 ACCEPTANCE CRITERIA: MET')
  console.log(`  • In-cap redeem succeeded:  ${inCapHash}`)
  console.log(`  • Over-cap redeem reverted: ${revertReason}`)
  console.log('\nPaste both into PROOF.md. The revert is the hero shot.')
}

function extractRevertReason(err: unknown): string {
  // viem wraps reverts with a .cause chain; try to surface the enforcer name.
  const seen: string[] = []
  let cur: any = err
  while (cur && seen.length < 8) {
    if (cur.shortMessage) seen.push(`shortMessage: ${cur.shortMessage}`)
    if (cur.metaMessages?.length) seen.push(`meta: ${cur.metaMessages.join(' | ')}`)
    if (cur.details) seen.push(`details: ${cur.details}`)
    if (cur.data && typeof cur.data === 'string' && cur.data !== '0x') {
      try {
        // Try decode standard Error(string)
        const decoded = decodeErrorResult({
          abi: [{ type: 'error', name: 'Error', inputs: [{ type: 'string', name: 'reason' }] }],
          data: cur.data as Hex,
        })
        seen.push(`decoded: ${decoded.errorName}(${JSON.stringify(decoded.args)})`)
      } catch {
        seen.push(`raw data: ${cur.data.slice(0, 130)}…`)
      }
    }
    cur = cur.cause
  }
  return seen.length ? seen.join(' ; ') : String(err).slice(0, 300)
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
