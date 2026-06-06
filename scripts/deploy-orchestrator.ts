// Phase 1 — Prompt 1.2.
// Deploy the orchestrator smart account on Base Sepolia and confirm it holds USDC.
//
// Why: CLAUDE.md footgun #1 — counterfactual accounts holding 0 USDC fail
// ERC-1271 signature validation in the DelegationManager. The account that
// redeems the mandate MUST be deployed AND funded.
//
// Implementation note: we deploy without a bundler. The MetaMask Hybrid
// smart account exposes getFactoryArgs() — { factory, factoryData } — and any
// EOA can call the factory to deploy the counterfactual SA via CREATE2.
// We use the orchestrator's own EOA so it pays the deployment gas itself.

import { erc20Abi, formatEther, formatUnits, parseUnits } from 'viem'
import { buildOrchestratorSmartAccount, isDeployed } from '../lib/accounts.js'
import {
  orchestratorAccount,
  orchestratorWalletSepolia,
  sepoliaPublicClient,
  USDC_SEPOLIA,
} from '../lib/config.js'

const MIN_USDC = parseUnits('1', 6) // any non-zero balance is enough for ERC-1271; 1 USDC is a tidy threshold

async function main() {
  const orch = await buildOrchestratorSmartAccount()
  console.log(`\nORCH EOA: ${orchestratorAccount.address}`)
  console.log(`ORCH SA : ${orch.address}\n`)

  // ── Step 1: deploy if counterfactual ─────────────────────────────────────
  if (await isDeployed(sepoliaPublicClient, orch.address)) {
    console.log('✓ ORCH SA is already deployed')
  } else {
    console.log('… ORCH SA is counterfactual — deploying via factory call')

    const factoryArgs = await orch.getFactoryArgs()
    if (!factoryArgs?.factory || !factoryArgs?.factoryData) {
      throw new Error('Smart account did not provide factoryArgs — cannot deploy')
    }
    const { factory, factoryData } = factoryArgs

    // Make sure the orchestrator EOA can pay gas
    const eoaEth = await sepoliaPublicClient.getBalance({ address: orchestratorAccount.address })
    if (eoaEth === 0n) {
      console.error(`\n  ORCH EOA has 0 ETH. Fund it via the Base Sepolia faucet:`)
      console.error(`  https://www.coinbase.com/faucets/base-ethereum-goerli-faucet`)
      console.error(`  Address: ${orchestratorAccount.address}`)
      process.exit(1)
    }
    console.log(`  Factory:     ${factory}`)
    console.log(`  EOA ETH:     ${formatEther(eoaEth)}`)
    console.log(`  Calling factory from ORCH EOA…`)

    const hash = await orchestratorWalletSepolia.sendTransaction({
      to: factory,
      data: factoryData,
    })
    console.log(`  Tx submitted: ${hash}`)

    const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') {
      throw new Error(`Deploy tx reverted: ${hash}`)
    }
    console.log(`  ✓ Mined in block ${receipt.blockNumber} (gas used: ${receipt.gasUsed})`)
    console.log(`  https://sepolia.basescan.org/tx/${hash}`)

    // Sanity-recheck that bytecode is now present at the SA address.
    // RPC reads can be stale immediately after a receipt — retry a few times.
    let deployedNow = false
    for (let attempt = 0; attempt < 6; attempt++) {
      if (await isDeployed(sepoliaPublicClient, orch.address)) {
        deployedNow = true
        break
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    if (!deployedNow) {
      throw new Error(
        `Tx succeeded but no code at ${orch.address} after 6 retries — factory mismatch?`,
      )
    }
    console.log(`✓ ORCH SA deployed at ${orch.address}`)
  }

  // ── Step 2: confirm USDC balance ─────────────────────────────────────────
  const usdc = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [orch.address],
  })

  console.log(`\nORCH SA USDC balance: ${formatUnits(usdc, 6)} USDC`)

  if (usdc >= MIN_USDC) {
    console.log('✓ ORCH SA holds USDC — Phase 1 prerequisites met')
    console.log('\nNext: scripts/proof.ts — sign the root mandate and run the revert demo')
    return
  }

  // Print clear funding instructions (per Prompt 1.2: don't auto-fund, instruct)
  console.error('\n✗ ORCH SA holds no USDC — fund it before running the proof.')
  console.error('\nFastest path (transfer from the ORCH EOA which holds 20 testnet USDC):')
  console.error('')
  console.error(`  cast send ${USDC_SEPOLIA} \\\n` +
                `    "transfer(address,uint256)" \\\n` +
                `    ${orch.address} \\\n` +
                `    5000000 \\\n` +
                `    --private-key $ORCHESTRATOR_PRIVATE_KEY \\\n` +
                `    --rpc-url $BASE_SEPOLIA_RPC_URL`)
  console.error('')
  console.error('(That sends 5 USDC. Re-run `npm run deploy:orchestrator` to confirm.)')
  process.exit(1)
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
