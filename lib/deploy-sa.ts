// Helper: deploy a counterfactual smart account by calling its factory directly
// from the owner EOA, and fund it with USDC if a target balance is requested.
// Used by Phase 1's proof script (USER SA) and deploy-orchestrator.ts (ORCH SA).

import { erc20Abi, formatEther, formatUnits } from 'viem'
import type { PublicClient, WalletClient, Account } from 'viem'
import { isDeployed } from './accounts.js'
import { USDC_SEPOLIA } from './config.js'

type SmartAccountLike = {
  address: `0x${string}`
  getFactoryArgs(): Promise<{ factory?: `0x${string}`; factoryData?: `0x${string}` } | undefined>
}

export async function ensureDeployed(
  label: string,
  sa: SmartAccountLike,
  ownerEoa: Account,
  walletClient: WalletClient,
  publicClient: PublicClient,
): Promise<{ deployed: boolean; deployTx?: `0x${string}` }> {
  if (await isDeployed(publicClient, sa.address)) {
    console.log(`  ✓ ${label} SA already deployed at ${sa.address}`)
    return { deployed: true }
  }

  const factoryArgs = await sa.getFactoryArgs()
  if (!factoryArgs?.factory || !factoryArgs?.factoryData) {
    throw new Error(`${label} SA gave no factoryArgs, cannot deploy`)
  }

  const eoaEth = await publicClient.getBalance({ address: ownerEoa.address })
  if (eoaEth === 0n) {
    throw new Error(
      `${label} EOA (${ownerEoa.address}) has 0 ETH, fund it on Base Sepolia first`,
    )
  }
  console.log(`  … deploying ${label} SA via factory ${factoryArgs.factory} (EOA gas: ${formatEther(eoaEth)} ETH)`)

  const hash = await walletClient.sendTransaction({
    account: ownerEoa,
    chain: walletClient.chain,
    to: factoryArgs.factory,
    data: factoryArgs.factoryData,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(`${label} deploy tx reverted: ${hash}`)
  }

  // RPC can serve stale code reads right after a receipt, retry briefly.
  for (let i = 0; i < 6; i++) {
    if (await isDeployed(publicClient, sa.address)) {
      console.log(`  ✓ ${label} SA deployed at ${sa.address}, tx ${hash}`)
      return { deployed: true, deployTx: hash }
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error(`${label} deploy tx succeeded but no code at ${sa.address}`)
}

/**
 * If the SA's USDC balance is below `minUsdc`, transfer `topUpUsdc` from the
 * owner EOA. Both amounts are in 6-decimal USDC base units.
 * Returns the funding tx hash if a transfer happened.
 */
export async function ensureFunded(
  label: string,
  saAddress: `0x${string}`,
  ownerEoa: Account,
  walletClient: WalletClient,
  publicClient: PublicClient,
  minUsdc: bigint,
  topUpUsdc: bigint,
): Promise<{ funded: boolean; fundTx?: `0x${string}`; balance: bigint }> {
  let bal = await publicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [saAddress],
  })

  if (bal >= minUsdc) {
    console.log(`  ✓ ${label} SA holds ${formatUnits(bal, 6)} USDC`)
    return { funded: true, balance: bal }
  }

  const eoaUsdc = await publicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [ownerEoa.address],
  })
  if (eoaUsdc < topUpUsdc) {
    throw new Error(
      `${label} SA needs USDC (has ${formatUnits(bal, 6)}, want ≥${formatUnits(minUsdc, 6)}) ` +
        `but owner EOA only holds ${formatUnits(eoaUsdc, 6)}, fund the EOA first`,
    )
  }

  console.log(`  … funding ${label} SA with ${formatUnits(topUpUsdc, 6)} USDC from owner EOA`)
  const hash = await walletClient.writeContract({
    account: ownerEoa,
    chain: walletClient.chain,
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [saAddress, topUpUsdc],
  })
  await publicClient.waitForTransactionReceipt({ hash })
  bal = await publicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [saAddress],
  })
  console.log(`  ✓ ${label} SA now holds ${formatUnits(bal, 6)} USDC, tx ${hash}`)
  return { funded: true, fundTx: hash, balance: bal }
}
