// Phase 1 sanity script (EXECUTION_PLAN.md Prompt 1.1):
// Build the four smart accounts, log each address, and report deployment status.

import { erc20Abi, formatEther, formatUnits } from 'viem'
import {
  buildBearSmartAccount,
  buildBullSmartAccount,
  buildOrchestratorSmartAccount,
  buildUserSmartAccount,
  isDeployed,
} from '../lib/accounts.js'
import {
  bearAccount,
  bullAccount,
  orchestratorAccount,
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
} from '../lib/config.js'

async function main() {
  const [user, orch, bull, bear] = await Promise.all([
    buildUserSmartAccount(),
    buildOrchestratorSmartAccount(),
    buildBullSmartAccount(),
    buildBearSmartAccount(),
  ])

  const rows = [
    { name: 'USER  EOA',  addr: userAccount.address,         sa: false },
    { name: 'USER  SA',   addr: user.address,                sa: true  },
    { name: 'ORCH  EOA',  addr: orchestratorAccount.address, sa: false },
    { name: 'ORCH  SA',   addr: orch.address,                sa: true  },
    { name: 'BULL  EOA',  addr: bullAccount.address,         sa: false },
    { name: 'BULL  SA',   addr: bull.address,                sa: true  },
    { name: 'BEAR  EOA',  addr: bearAccount.address,         sa: false },
    { name: 'BEAR  SA',   addr: bear.address,                sa: true  },
  ]

  console.log('\nCROSSFIRE — account check (Base Sepolia)\n' + '─'.repeat(120))
  console.log(
    'NAME       ADDRESS                                       DEPLOYED   ETH                 USDC',
  )
  console.log('─'.repeat(120))

  for (const r of rows) {
    const [code, ethBal, usdcBal] = await Promise.all([
      sepoliaPublicClient.getCode({ address: r.addr }),
      sepoliaPublicClient.getBalance({ address: r.addr }),
      sepoliaPublicClient.readContract({
        address: USDC_SEPOLIA,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [r.addr],
      }),
    ])
    const deployed = !!code && code !== '0x'
    const flag = r.sa ? (deployed ? 'yes' : 'NO (counterfactual)') : '—'
    console.log(
      `${r.name.padEnd(10)} ${r.addr}   ${flag.padEnd(10)} ${formatEther(ethBal).padEnd(20)} ${formatUnits(usdcBal, 6)}`,
    )
  }

  // Sanity: Phase 1 needs ORCH SA deployed AND holding USDC.
  // Surface that explicitly so the next script (deploy-orchestrator) knows what's left.
  const orchSaDeployed = await isDeployed(sepoliaPublicClient, orch.address)
  const orchSaUsdc = await sepoliaPublicClient.readContract({
    address: USDC_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [orch.address],
  })

  console.log('\nPhase 1 prerequisites for the revert proof:')
  console.log(`  ORCH SA deployed:   ${orchSaDeployed ? 'YES ✓' : 'NO — run npm run deploy:orchestrator'}`)
  console.log(`  ORCH SA holds USDC: ${orchSaUsdc > 0n ? `YES ✓ (${formatUnits(orchSaUsdc, 6)} USDC)` : `NO — send Sepolia USDC to ${orch.address}`}`)
  console.log('')
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
