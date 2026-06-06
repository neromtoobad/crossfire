// Phase 8.10 — shared 1Shot mainnet relay flow with structured events.
//
// Same orchestration as scripts/relay-bet.ts, but emits events through an
// onEvent callback so it can drive a UI stream (or a CLI log).
//
// What we do, in order:
//   1. read USER mainnet USDC + ETH (must have ≥ MAX_USDC_SPEND USDC)
//   2. relayer_getCapabilities → targetAddress + feeCollector
//   3. relayer_getFeeData → fee quote
//   4. build + sign delegation: USER (as in-flight 7702 stateless delegator)
//      → relayerTarget, scope Erc20TransferAmount on USDC, cap MAX_USDC_SPEND
//   5. sign EIP-7702 authorization upgrading USER EOA to Stateless7702 impl
//   6. relayer_estimate7710Transaction → locks fee context
//   7. relayer_send7710Transaction → TaskId
//   8. poll relayer_getStatus until terminal (Confirmed / Rejected / Reverted)
//
// Real USDC moves. Real mainnet. Real EIP-7702. This is the 1Shot track
// proof in main flow.

import { encodeFunctionData, erc20Abi, formatUnits, parseUnits, type Hex } from 'viem'
import { signAuthorization } from 'viem/accounts'
import {
  createDelegation,
  ScopeType,
  signDelegation,
  getSmartAccountsEnvironment,
} from '@metamask/smart-accounts-kit'
import {
  createCaveatBuilder,
  generateSalt,
} from '@metamask/smart-accounts-kit/utils'
import { env } from './env.js'
import { userAccount } from './config.js'
import {
  MAINNET_CHAIN_ID,
  USDC_MAINNET,
  mainnetPublicClient,
} from './mainnet-config.js'
import { relayer, statusName, TERMINAL_STATUSES, RelayerStatus } from './relayer.js'
import { setLatestRelayDispatch } from './relayer-state.js'

// Hard cap on what the relayer can spend per relay (fee + work). The relayer
// charges the actual fee; anything within cap is bounded by the chain.
const MAX_USDC_SPEND = parseUnits('3', 6)
// Generous fee upper bound — relayer keeps only what it needs.
const FEE_TRANSFER_USDC = parseUnits('2', 6)
// The "work" transfer — minimal real action so the relay does something on-chain.
const WORK_TRANSFER_ATOMS = 1000n // 0.001 USDC back to USER

export type RelayEvent =
  | { type: 'started'; chainId: number; userAddress: Hex; usdcBal: string; ethBal: string }
  | { type: 'capabilities'; targetAddress: Hex; feeCollector: Hex }
  | { type: 'fee-quoted'; minFee: string; rate: number; gasPrice: Hex; expiry: number }
  | { type: 'delegation-signed'; cap: string; tokenAddress: Hex; target: Hex }
  | { type: '7702-signed'; implementation: Hex; nonce: number }
  | { type: 'estimated'; requiredPayment?: string; gasUsed: Record<string, string> }
  | { type: 'submitted'; taskId: Hex; webhook?: string; memo: string }
  | { type: 'status-tick'; taskId: Hex; status: number; statusName: string }
  | { type: 'terminal'; status: number; statusName: string; txHash?: Hex; message?: string; data?: string; isSuccess: boolean }
  | { type: 'error'; message: string }

export type RunMainnetRelayOptions = {
  onEvent?: (e: RelayEvent) => void | Promise<void>
  webhookUrl?: string
  memo?: string
  pollIntervalMs?: number
  timeoutMs?: number
}

export async function runMainnetRelay(opts: RunMainnetRelayOptions = {}): Promise<{
  taskId: Hex
  terminalStatus: number
  txHash?: Hex
}> {
  const emit = async (e: RelayEvent) => { await opts.onEvent?.(e) }
  const pollIntervalMs = opts.pollIntervalMs ?? 4000
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000
  const memo = opts.memo ?? 'crossfire-precall-mainnet-relay'

  // ── 1. Sanity: balances ──────────────────────────────────────────────
  const usdcBal = await mainnetPublicClient.readContract({
    address: USDC_MAINNET, abi: erc20Abi, functionName: 'balanceOf',
    args: [userAccount.address],
  })
  const ethBal = await mainnetPublicClient.getBalance({ address: userAccount.address })
  await emit({
    type: 'started', chainId: MAINNET_CHAIN_ID, userAddress: userAccount.address,
    usdcBal: formatUnits(usdcBal, 6), ethBal: formatUnits(ethBal, 18),
  })
  if (usdcBal < MAX_USDC_SPEND) {
    throw new Error(`USER EOA needs ≥ ${formatUnits(MAX_USDC_SPEND, 6)} USDC on Base mainnet (has ${formatUnits(usdcBal, 6)})`)
  }

  // ── 2. capabilities ──────────────────────────────────────────────────
  const caps = await relayer.getCapabilities([MAINNET_CHAIN_ID])
  const chainCaps = caps[String(MAINNET_CHAIN_ID)]
  if (!chainCaps) throw new Error('No mainnet capabilities returned')
  await emit({
    type: 'capabilities',
    targetAddress: chainCaps.targetAddress, feeCollector: chainCaps.feeCollector,
  })
  const relayerTarget: Hex = chainCaps.targetAddress

  // ── 3. fee quote ─────────────────────────────────────────────────────
  const feeData = await relayer.getFeeData({ chainId: MAINNET_CHAIN_ID, token: USDC_MAINNET })
  await emit({
    type: 'fee-quoted',
    minFee: feeData.minFee, rate: feeData.rate, gasPrice: feeData.gasPrice, expiry: feeData.expiry,
  })

  // ── 4. delegation (USER as in-flight 7702 stateless delegator → relayer) ─
  const environment = getSmartAccountsEnvironment(MAINNET_CHAIN_ID as any)
  const caveats = createCaveatBuilder(environment)
    .addCaveat('allowedTargets', { targets: [USDC_MAINNET] })
    .build()
  const delegation = createDelegation({
    from: userAccount.address, to: relayerTarget,
    scope: {
      type: ScopeType.Erc20TransferAmount, tokenAddress: USDC_MAINNET, maxAmount: MAX_USDC_SPEND,
    },
    caveats, salt: generateSalt(), environment,
  })
  const signature = await signDelegation({
    privateKey: env.USER_PRIVATE_KEY,
    delegation,
    delegationManager: environment.DelegationManager,
    chainId: MAINNET_CHAIN_ID,
  })
  const signedDelegation = { ...delegation, signature }
  await emit({
    type: 'delegation-signed',
    cap: formatUnits(MAX_USDC_SPEND, 6),
    tokenAddress: USDC_MAINNET, target: relayerTarget,
  })

  // ── 5. EIP-7702 authorization (in-flight EOA upgrade) ────────────────
  const stateless7702Impl = environment.implementations.EIP7702StatelessDeleGatorImpl as Hex
  const userNonce = await mainnetPublicClient.getTransactionCount({ address: userAccount.address })
  const auth = await signAuthorization({
    privateKey: env.USER_PRIVATE_KEY,
    chainId: MAINNET_CHAIN_ID,
    contractAddress: stateless7702Impl,
    nonce: userNonce,
  })
  await emit({ type: '7702-signed', implementation: stateless7702Impl, nonce: userNonce })

  const authList = [{
    chainId: auth.chainId, address: auth.address as Hex, nonce: Number(auth.nonce),
    yParity: auth.yParity as 0 | 1, r: auth.r as Hex, s: auth.s as Hex,
  }]

  // ── 6. estimate (locks context) ──────────────────────────────────────
  const feeTransferData = encodeFunctionData({
    abi: erc20Abi, functionName: 'transfer', args: [chainCaps.feeCollector, FEE_TRANSFER_USDC],
  })
  const workCallData = encodeFunctionData({
    abi: erc20Abi, functionName: 'transfer', args: [userAccount.address, WORK_TRANSFER_ATOMS],
  })
  const work = {
    permissionContext: [signedDelegation],
    executions: [
      { target: USDC_MAINNET, value: '0', data: feeTransferData },
      { target: USDC_MAINNET, value: '0', data: workCallData },
    ],
  }
  const est = await relayer.estimate7710Transaction({
    chainId: MAINNET_CHAIN_ID, transactions: [work], authorizationList: authList,
  })
  if (!est.success) throw new Error(`Estimate failed: ${est.error ?? 'unknown'}`)
  await emit({ type: 'estimated', requiredPayment: est.requiredPaymentAmount, gasUsed: est.gasUsed })

  // ── 7. submit ────────────────────────────────────────────────────────
  const taskId = await relayer.send7710Transaction({
    chainId: MAINNET_CHAIN_ID,
    transactions: [work],
    authorizationList: authList,
    context: est.context,
    destinationUrl: opts.webhookUrl,
    memo,
  })
  await emit({ type: 'submitted', taskId, webhook: opts.webhookUrl, memo })

  setLatestRelayDispatch({
    dispatchedAt: Date.now(), taskId, chainId: MAINNET_CHAIN_ID, memo,
    work: [{ target: work.executions[0]!.target, value: work.executions[0]!.value, callData: work.executions[0]!.data }],
  })

  // ── 8. poll until terminal ───────────────────────────────────────────
  const start = Date.now()
  let lastStatus = -1
  let terminal: Awaited<ReturnType<typeof relayer.getStatus>> | null = null
  while (Date.now() - start < timeoutMs) {
    const s = await relayer.getStatus(taskId, true)
    if (s.status !== lastStatus) {
      await emit({ type: 'status-tick', taskId, status: s.status, statusName: statusName(s.status) })
      lastStatus = s.status
    }
    if (TERMINAL_STATUSES.includes(s.status)) {
      terminal = s
      break
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs))
  }

  if (!terminal) {
    await emit({ type: 'error', message: `Status never reached terminal within ${Math.round(timeoutMs / 1000)}s` })
    throw new Error('Status polling timed out')
  }

  const txHash = (terminal.hash ?? terminal.receipt?.transactionHash) as Hex | undefined
  const isSuccess = terminal.status === RelayerStatus.Confirmed
  await emit({
    type: 'terminal',
    status: terminal.status,
    statusName: statusName(terminal.status),
    txHash, message: terminal.message, data: terminal.data,
    isSuccess,
  })

  return { taskId, terminalStatus: terminal.status, txHash }
}
