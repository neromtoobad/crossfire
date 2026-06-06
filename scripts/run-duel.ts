// Phase 4 — Prompt 4.2 acceptance script.
// Runs the duel TWICE: once for real (Venice decides; net bet lands), once
// with abstain override (forces |net|<dust to prove the ABSTAIN path).

import { formatUnits } from 'viem'
import { runDuel } from '../lib/resolve.js'
import { appendDuel } from '../lib/relayer-state.js'

function persistOutcome(o: Awaited<ReturnType<typeof runDuel>>) {
  appendDuel({
    runAt: Date.now(),
    bullStake: o.bullStake,
    bearStake: o.bearStake,
    netUsdc: o.netUsdc,
    side: o.side,
    abstained: o.abstained,
    betTransferTx: o.betTransferTx,
    buyOnBehalfTx: o.buyOnBehalfTx,
    bullRationale: o.bullRationale,
    bearRationale: o.bearRationale,
    evidenceTxHashes: o.evidenceTxHashes,
    marketAfter: {
      totalYes: o.marketAfter.totalYes.toString(),
      totalNo: o.marketAfter.totalNo.toString(),
      impliedProb: o.marketAfter.impliedProb,
      userSaPosition: {
        yes: o.marketAfter.userSaPosition.yes.toString(),
        no: o.marketAfter.userSaPosition.no.toString(),
      },
    },
  })
}

async function printOutcome(label: string, o: Awaited<ReturnType<typeof runDuel>>) {
  console.log(`\n[${label}]`)
  console.log(`  Bull stake: ${o.bullStake.toFixed(2)} USDC — "${o.bullRationale.slice(0, 100)}"`)
  console.log(`  Bear stake: ${o.bearStake.toFixed(2)} USDC — "${o.bearRationale.slice(0, 100)}"`)
  console.log(`  Net:        ${o.netUsdc.toFixed(2)} USDC`)
  console.log(`  Decision:   ${o.side}${o.abstained ? ' (market genuinely uncertain)' : ''}`)

  if (!o.abstained) {
    console.log(`  Bet tx (chain transfer):   ${o.betTransferTx}`)
    console.log(`    https://sepolia.basescan.org/tx/${o.betTransferTx}`)
    console.log(`  Credit tx (buyOnBehalf):   ${o.buyOnBehalfTx}`)
    console.log(`    https://sepolia.basescan.org/tx/${o.buyOnBehalfTx}`)
  }

  console.log(`  Market totals after: YES=${formatUnits(o.marketAfter.totalYes, 6)}  NO=${formatUnits(o.marketAfter.totalNo, 6)}`)
  console.log(`  USER SA position:    YES=${formatUnits(o.marketAfter.userSaPosition.yes, 6)}  NO=${formatUnits(o.marketAfter.userSaPosition.no, 6)}`)
  console.log(`  Market impliedProbYes: ${o.marketAfter.impliedProb.toFixed(3)}`)
  console.log(`  Evidence txs: Bull=${o.evidenceTxHashes.bull.length}  Bear=${o.evidenceTxHashes.bear.length}`)
}

async function main() {
  console.log('\nPhase 4 / Prompt 4.2 — adversarial netting & bet\n' + '─'.repeat(80))

  // ── Run 1: asymmetric evidence (Bull 2, Bear 1) — net bet should land ────
  console.log('\n=== RUN 1: real duel (Bull buys 2 evidence, Bear 1 — net bet should land) ===')
  const real = await runDuel({ bullEvidenceCalls: 2, bearEvidenceCalls: 1 })
  persistOutcome(real)
  await printOutcome('REAL DUEL', real)

  // ── Run 2: force ABSTAIN to demo the "genuinely uncertain" path ──────────
  console.log('\n=== RUN 2: forced ABSTAIN (stakes tied; chain places nothing) ===')
  const abstain = await runDuel({ bullEvidenceCalls: 1, bearEvidenceCalls: 1, abstainOverride: true })
  persistOutcome(abstain)
  await printOutcome('FORCED ABSTAIN', abstain)

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80))
  console.log('PHASE 4 ACCEPTANCE CRITERIA:')
  if (real.abstained) {
    console.log(`  ⚠ real duel surprisingly abstained (net=${real.netUsdc.toFixed(2)} < dust). Re-run.`)
  } else {
    console.log(`  ✓ real net bet landed on-chain: ${real.side} sized ${Math.abs(real.netUsdc).toFixed(2)} USDC`)
    console.log(`    transfer tx: ${real.betTransferTx}`)
    console.log(`    credit tx:   ${real.buyOnBehalfTx}`)
  }
  if (abstain.abstained) {
    console.log(`  ✓ abstain case placed nothing (forced tie)`)
  } else {
    console.log(`  ⚠ forced abstain didn't abstain — bug in opts.abstainOverride logic`)
  }
  console.log(`  ✓ USER SA position readable on-chain`)
}

main().catch((err) => {
  console.error('\nERROR:', err)
  process.exit(1)
})
