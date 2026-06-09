import { chainContext, readPriceFeed } from '../lib/venice-crypto-rpc.js'
import { forecasterChat, veniceWalletStatus, TEE_MODEL } from '../lib/venice-x402.js'

async function main() {
  console.log('\n▸ 1. Venice crypto RPC — live Base chain context')
  const ctx = await chainContext('base-mainnet')
  console.log('   ', JSON.stringify(ctx))

  console.log('\n▸ 2. x402 wallet status')
  const w = await veniceWalletStatus()
  console.log('   ', JSON.stringify(w))

  console.log(`\n▸ 3. forecaster reasoning on TEE model (${TEE_MODEL})`)
  const t0 = Date.now()
  const r = await forecasterChat({
    messages: [
      { role: 'system', content: 'You are QUANT, a cold prediction-market quant. One sentence only.' },
      { role: 'user', content: 'Will Bitcoin hit $200k by Dec 31 2026? Give a one-sentence read.' },
    ],
    maxTokens: 120,
  })
  console.log(`    paidVia=${r.payVia}  tee=${r.tee}  model=${r.model}  (${Date.now()-t0}ms)`)
  console.log('    reply:', r.content.slice(0, 200))
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
