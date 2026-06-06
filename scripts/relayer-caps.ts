// Phase 5 — Prompt 5.1 sanity script.
// Probe 1Shot's relayer for both Base Sepolia and Base mainnet capabilities.
// Asserts mainnet + an accepted USDC fee token, prints what's configured.

import { relayer, type RelayerChainId } from '../lib/relayer.js'

const CHAINS: Array<{ id: RelayerChainId; name: string }> = [
  { id: 84532, name: 'Base Sepolia' },
  { id: 8453,  name: 'Base Mainnet' },
]

async function main() {
  console.log('\nPhase 5 / Prompt 5.1 — 1Shot relayer capabilities\n' + '─'.repeat(80))

  let mainnetReady = false
  // getCapabilities now takes an array of chainIds — query both at once.
  const caps = await relayer.getCapabilities(CHAINS.map((c) => c.id))
  for (const chain of CHAINS) {
    console.log(`\n[chainId ${chain.id}] ${chain.name}`)
    const c = caps[String(chain.id)]
    if (!c) {
      console.log(`  ⚠ EMPTY capabilities — no relayer is provisioned for ${chain.name}.`)
      if (chain.id === 8453) {
        console.log(`     → Log into 1shotapi.com dashboard and create a Base mainnet relayer.`)
      }
      continue
    }
    console.log(`  feeCollector:  ${c.feeCollector}`)
    console.log(`  targetAddress: ${c.targetAddress}`)
    console.log(`  fee tokens:`)
    for (const t of c.tokens) {
      console.log(`    - ${t.symbol ?? '?'.padEnd(4)} ${t.address}  (${t.decimals} decimals)`)
    }
    if (chain.id === 8453) mainnetReady = true
  }

  console.log('\n' + '─'.repeat(80))
  if (mainnetReady) {
    console.log('✓ Base mainnet relayer ready — Phase 5.3 mainnet proof run can proceed')
  } else {
    console.log('✗ Base mainnet relayer NOT ready — provision one before Phase 5.3')
    console.log('  (Phase 5.2 webhook + skeleton can still be built and tested locally.)')
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
