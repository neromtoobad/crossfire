// Phase 5 — Prompts 5.2 + 5.3.
//
// Submit ONE real 1Shot relay on Base mainnet. Captures TaskId, polls status
// until terminal (Confirmed / Rejected / Reverted), and persists the run so
// the dashboard + PROOF.md can show "webhook flipped to success".
//
// What we send (deliberately tiny — this costs real USDC):
//   - work: USDC.transfer(USER EOA, 1_000) — 0.001 USDC back to self (no-op-ish)
//   - delegation: USER EOA signs ONE delegation to 1Shot's targetAddress,
//     scope Erc20TransferAmount on USDC capped just over the expected fee
//   - authorizationList: EIP-7702 auth upgrading USER EOA to a 7702 stateless
//     delegator IN-FLIGHT (so we don't need a deployed SA on mainnet)
//   - context: locked quote from relayer_getFeeData
//
// If the 7702 upgrade or relayer encoding is rejected, we log and exit non-zero
// with the exact failure for triage. We do NOT retry — this is the one shot.

import { encodeFunctionData, erc20Abi, formatUnits, parseUnits, type Hex } from 'viem'
import { signAuthorization } from 'viem/accounts'
import {
  createDelegation,
  ScopeType,
  signDelegation,
  Implementation,
} from '@metamask/smart-accounts-kit'
import {
  createCaveatBuilder,
  generateSalt,
} from '@metamask/smart-accounts-kit/utils'
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'
import { env } from '../lib/env.js'
import { userAccount } from '../lib/config.js'
import {
  MAINNET_CHAIN_ID,
  USDC_MAINNET,
  mainnetPublicClient,
} from '../lib/mainnet-config.js'
import { relayer, statusName, TERMINAL_STATUSES } from '../lib/relayer.js'
import { setLatestRelayDispatch } from '../lib/relayer-state.js'

// Webhook URL the relayer will POST status to. For local dev, the demo runs
// `next dev` + a public tunnel (ngrok/cloudflared); set DESTINATION_WEBHOOK_URL.
const WEBHOOK_URL = process.env.DESTINATION_WEBHOOK_URL // optional

// Hard ceiling on USDC we authorize the relayer to spend on our behalf.
// Generous enough to cover the fee + the 1_000-unit work transfer. We tried
// 1 USDC first; on Base mainnet at current gas prices the fee comes out to
// ~$0.20-$1.00 for a tiny tx, so 3 USDC gives comfortable headroom without
// risking much. Real spend is capped by the chain at this delegation hash.
const MAX_USDC_SPEND = parseUnits('3', 6)
// Fee transfer amount included in executions. Generous upper bound — anything
// in excess is the relayer's, per their public-relayer contract. We can tune
// this down after the first successful run shows the real fee.
const FEE_TRANSFER_USDC = parseUnits('2', 6)

async function main() {
  console.log('\nPhase 5 / Prompts 5.2+5.3 — REAL Base mainnet 1Shot relay\n' + '─'.repeat(80))

  // ── Sanity: USER mainnet USDC balance ────────────────────────────────────
  const usdcBal = await mainnetPublicClient.readContract({
    address: USDC_MAINNET,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAccount.address],
  })
  const ethBal = await mainnetPublicClient.getBalance({ address: userAccount.address })
  console.log(`  USER EOA:           ${userAccount.address}`)
  console.log(`  USER mainnet USDC:  ${formatUnits(usdcBal, 6)}`)
  console.log(`  USER mainnet ETH:   ${formatUnits(ethBal, 18)} (gas paid in USDC by relayer)`)
  if (usdcBal < MAX_USDC_SPEND) {
    throw new Error(`USER EOA needs ≥ ${formatUnits(MAX_USDC_SPEND, 6)} USDC on mainnet`)
  }

  // ── 1. Look up relayer target + fee token from capabilities ─────────────
  console.log(`\n[1/4] Fetching capabilities…`)
  const caps = await relayer.getCapabilities([MAINNET_CHAIN_ID])
  const chainCaps = caps[String(MAINNET_CHAIN_ID)]
  if (!chainCaps) throw new Error('No mainnet capabilities returned')
  console.log(`  targetAddress: ${chainCaps.targetAddress}`)
  console.log(`  feeCollector:  ${chainCaps.feeCollector}`)
  const relayerTarget: Hex = chainCaps.targetAddress

  // ── 2. Get rough fee quote (will be re-locked via estimate below) ───────
  console.log(`\n[2/4] Fee quote (USDC)…`)
  const feeData = await relayer.getFeeData({
    chainId: MAINNET_CHAIN_ID,
    token: USDC_MAINNET,
  })
  console.log(`  minFee:   ${feeData.minFee} (atomic)`)
  console.log(`  rate:     ${feeData.rate}`)
  console.log(`  gasPrice: ${feeData.gasPrice}`)
  console.log(`  expiry:   ${feeData.expiry}`)

  // ── 3. Build + sign the delegation USER → relayerTarget ──────────────────
  //
  // USER (treated as a 7702 stateless delegator via the in-flight upgrade
  // below) signs a capped USDC delegation that the relayer will redeem to
  // (a) pay itself the fee in USDC and (b) execute the work transaction.
  //
  // NOTE: this signature path uses the kit's signDelegation with the USER EOA
  // private key. The 1Shot relayer will only be able to act within the cap.
  const environment = getSmartAccountsEnvironment(MAINNET_CHAIN_ID as any)

  const caveats = createCaveatBuilder(environment)
    .addCaveat('allowedTargets', { targets: [USDC_MAINNET] })
    .build()

  const delegation = createDelegation({
    from: userAccount.address,
    to: relayerTarget,
    scope: {
      type: ScopeType.Erc20TransferAmount,
      tokenAddress: USDC_MAINNET,
      maxAmount: MAX_USDC_SPEND,
    },
    caveats,
    salt: generateSalt(),
    environment,
  })
  const signature = await signDelegation({
    privateKey: env.USER_PRIVATE_KEY,
    delegation,
    delegationManager: environment.DelegationManager,
    chainId: MAINNET_CHAIN_ID,
  })
  const signedDelegation = { ...delegation, signature }
  console.log(`[3/4] Signed delegation — cap ${formatUnits(MAX_USDC_SPEND, 6)} USDC, target USDC only`)

  // ── 4. Submit the relay ──────────────────────────────────────────────────
  //
  // EIP-7702 authorizationList is required when the executing account is a
  // raw EOA. Constructing the auth signature is itself a stack of steps
  // (chainId, contractAddress=Stateless7702Delegator, nonce, then sign). The
  // kit's `Implementation.Stateless7702` is the implementation address;
  // resolve via environment.implementations.
  //
  // EIP-7702 authorization — designates USER EOA's "code" to be the
  // Stateless7702 delegator implementation for this batch. Without it, USER
  // EOA's code is 0x and the DelegationManager can't validate signatures
  // (which is why the relayer was returning "invalid address … value=null").
  const stateless7702Impl = environment.implementations
    .EIP7702StatelessDeleGatorImpl as Hex
  const userNonce = await mainnetPublicClient.getTransactionCount({
    address: userAccount.address,
  })
  console.log(`\n  Signing EIP-7702 authorization`)
  console.log(`    implementation: ${stateless7702Impl}`)
  console.log(`    nonce:          ${userNonce}`)
  const auth = await signAuthorization({
    privateKey: env.USER_PRIVATE_KEY,
    chainId: MAINNET_CHAIN_ID,
    contractAddress: stateless7702Impl,
    nonce: userNonce,
  })

  // Per-tx shape per 1Shot spec: permissionContext is the RAW delegation
  // object array (not encoded bytes); executions is the array of inner calls.
  // Per the spec, executions = [fee transfer, ...work calls].
  const feeTransferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [chainCaps.feeCollector, FEE_TRANSFER_USDC],
  })
  const workCallData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [userAccount.address, 1000n], // 0.001 USDC back to self — minimal real action
  })
  const work = {
    permissionContext: [signedDelegation],
    executions: [
      { target: USDC_MAINNET, value: '0', data: feeTransferData },
      { target: USDC_MAINNET, value: '0', data: workCallData },
    ],
  }
  console.log(`[3.5/4] Executions: fee ${formatUnits(FEE_TRANSFER_USDC, 6)} USDC → feeCollector, work 0.001 USDC → USER`)

  const authList = [{
    chainId: auth.chainId,
    address: auth.address as Hex,
    nonce: Number(auth.nonce),
    yParity: auth.yParity as 0 | 1,
    r: auth.r as Hex,
    s: auth.s as Hex,
  }]

  // ── 3.5. Estimate to validate + lock a fresh context ─────────────────────
  console.log(`\n  Estimating to lock fee context…`)
  const est = await relayer.estimate7710Transaction({
    chainId: MAINNET_CHAIN_ID,
    transactions: [work],
    authorizationList: authList,
  })
  if (!est.success) throw new Error(`Estimate failed: ${est.error ?? 'unknown'}`)
  console.log(`  ✓ estimate success`)
  console.log(`    gasUsed:          ${JSON.stringify(est.gasUsed)}`)
  console.log(`    required payment: ${est.requiredPaymentAmount} USDC atoms`)

  console.log(`\n[4/4] Submitting relay…`)
  console.log(`  work: USDC.transfer(${userAccount.address}, 0.001 USDC)`)
  console.log(`  webhook: ${WEBHOOK_URL ?? '(none — will poll status)'}`)

  const taskId = await relayer.send7710Transaction({
    chainId: MAINNET_CHAIN_ID,
    transactions: [work],
    authorizationList: authList,
    context: est.context, // locked context from estimate
    destinationUrl: WEBHOOK_URL,
    memo: 'crossfire-phase5-mainnet-proof',
  })
  console.log(`  ✓ submitted — TaskId: ${taskId}`)

  setLatestRelayDispatch({
    dispatchedAt: Date.now(),
    taskId,
    chainId: MAINNET_CHAIN_ID,
    memo: 'crossfire-phase5-mainnet-proof',
    work: [{ target: work.executions[0]!.target, value: work.executions[0]!.value, callData: work.executions[0]!.data }],
  })

  // ── Poll for terminal status (webhook is preferred but optional) ─────────
  console.log(`\n  Polling getStatus until terminal…`)
  const start = Date.now()
  const timeoutMs = 5 * 60 * 1000 // 5 min cap
  let terminal: Awaited<ReturnType<typeof relayer.getStatus>> | null = null
  while (Date.now() - start < timeoutMs) {
    const s = await relayer.getStatus(taskId, true)
    process.stdout.write(`\r  status: ${statusName(s.status).padEnd(20)}`)
    if (TERMINAL_STATUSES.includes(s.status)) {
      terminal = s
      break
    }
    await new Promise((r) => setTimeout(r, 4000))
  }
  console.log('')

  if (!terminal) throw new Error('Status never reached terminal — timed out polling')
  console.log(`\n  Terminal status:  ${statusName(terminal.status)} (${terminal.status})`)
  const txHash = terminal.hash ?? terminal.receipt?.transactionHash
  if (txHash) {
    console.log(`  tx:               ${txHash}`)
    console.log(`  https://basescan.org/tx/${txHash}`)
  }
  if (terminal.message) console.log(`  message:          ${terminal.message}`)
  if (terminal.data) console.log(`  revert data:      ${terminal.data}`)

  console.log('\n' + '─'.repeat(80))
  if (terminal.status === 200) {
    console.log('✓ Phase 5.3 ACCEPTANCE MET — real Base-mainnet relay completed, gas paid in USDC.')
  } else {
    console.log(`✗ Relay ended ${statusName(terminal.status)}: ${terminal.message ?? 'see status payload'}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
