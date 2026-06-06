// Phase 4 — Prompt 4.1.
// Deploy BinaryMarket.sol to Base Sepolia from USER EOA, print the address,
// and tell the user to update .env.local + the mandate's allowed-targets caveat.
//
// We bypass Foundry's `forge create` and use viem directly so the deploy
// shares all our env / address resolution logic — same code path Phase 5
// uses to deploy other contracts if needed.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  sepoliaPublicClient,
  USDC_SEPOLIA,
  userAccount,
  userWalletSepolia,
} from '../lib/config.js'

type ForgeArtifact = {
  abi: any
  bytecode: { object: `0x${string}` }
}

function loadArtifact(name: string): ForgeArtifact {
  const path = resolve(process.cwd(), `contracts/out/${name}.sol/${name}.json`)
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw) as ForgeArtifact
}

async function main() {
  console.log('\nPhase 4 / Prompt 4.1 — deploy BinaryMarket on Base Sepolia\n' + '─'.repeat(80))

  const art = loadArtifact('BinaryMarket')
  if (!art.bytecode?.object) {
    throw new Error('Foundry artifact missing bytecode — run `cd contracts && forge build` first')
  }

  const question = 'Will CROSSFIRE ship its working demo on time?'
  const closeTime = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60) // +7 days

  console.log(`Deployer:   USER EOA ${userAccount.address}`)
  console.log(`USDC:       ${USDC_SEPOLIA}`)
  console.log(`Question:   "${question}"`)
  console.log(`Close time: ${closeTime}s (≈ ${new Date(Number(closeTime) * 1000).toISOString()})`)
  console.log('\n  … deploying …')

  const hash = await userWalletSepolia.deployContract({
    abi: art.abi,
    bytecode: art.bytecode.object,
    args: [USDC_SEPOLIA, question, closeTime],
  })
  console.log(`  tx submitted: ${hash}`)

  const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success' || !receipt.contractAddress) {
    throw new Error(`Deploy tx ${hash} reverted or returned no contract address`)
  }
  const marketAddress = receipt.contractAddress
  console.log(`\n  ✓ deployed at ${marketAddress}`)
  console.log(`  block ${receipt.blockNumber} · gas used ${receipt.gasUsed}`)
  console.log(`  https://sepolia.basescan.org/address/${marketAddress}`)

  // Sanity: read back the question via positionOf default (or skip — basescan
  // verification is the truth source).
  console.log('\n' + '─'.repeat(80))
  console.log('NEXT STEPS:')
  console.log(`  1. Update .env.local:`)
  console.log(`       MARKET_ADDRESS=${marketAddress}`)
  console.log(`  2. The mandate's allowedTargets caveat already conditionally includes`)
  console.log(`     MARKET_ADDRESS when it's set in env — re-run \`npm run proof\` to`)
  console.log(`     confirm the revert proof still works with the expanded target list.`)
  console.log(`  3. Append to PROOF.md:`)
  console.log(`       Market: \`${marketAddress}\`  deploy tx \`${hash}\``)
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
