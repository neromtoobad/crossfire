// Phase 8.2 CLI tester — run the council against one market, print the
// outcome, optionally persist to .crossfire/calls.json (so the landing
// renders it). Iterates on Venice prompts without UI noise.
//
// Usage:
//   npm run council:test                       # default: btc-200k-2026
//   npm run council:test fed-rate-cut          # specific market
//   npm run council:test trump-sbf-pardon --save
//   npm run council:test openai-gpt6-2026 --save

import { runCouncil } from '../lib/council/orchestrator.js'
import { addCall } from '../lib/calls-store.js'

async function main() {
  const marketId = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'btc-200k-2026'
  const persist = process.argv.includes('--save')

  console.log('\nPhase 8.2 — council test\n' + '─'.repeat(80))
  console.log(`  market:   ${marketId}`)
  console.log(`  persist:  ${persist ? 'YES (writes to .crossfire/calls.json)' : 'no (dry-run)'}\n`)

  const call = await runCouncil(marketId, {
    onEvent: (e) => {
      switch (e.type) {
        case 'started':
          console.log(`▸ started · "${e.marketTitle}" · impliedYes ${(e.impliedProbYes * 100).toFixed(0)}%`)
          break
        case 'role-vote':
          console.log(`▸ ${e.vote.role.padEnd(12)} ${e.vote.vote.padEnd(8)} ${(e.vote.confidence * 100).toFixed(0)}% — ${e.vote.oneLiner}`)
          break
        case 'majority':
          console.log(`▸ majority: ${e.side} (${e.agreeing}/${e.total} agreed)`)
          break
        case 'skeptic-verdict':
          console.log(`▸ Skeptic     refutation conf ${(e.vote.confidence * 100).toFixed(0)}% — ${e.vote.oneLiner}`)
          break
        case 'gate-decision':
          console.log(`▸ gate: ${e.passed ? 'PASSED' : 'REFUSED'}${e.reasons.length ? ' · ' + e.reasons.join(' · ') : ''}`)
          break
        case 'thesis-generated':
          console.log(`▸ thesis generated`)
          break
        case 'published':
          console.log(`▸ ✓ PUBLISHED call ${e.call.id}`)
          break
        case 'refused':
          console.log(`▸ ✗ REFUSED · ${e.reason}`)
          break
        case 'error':
          console.log(`▸ ERROR · ${e.message}`)
          break
      }
    },
  })

  console.log('\n' + '─'.repeat(80))
  if (!call) {
    console.log('Council did not publish.')
    return
  }

  console.log(`\nPUBLISHED CALL: ${call.id}`)
  console.log(`  Side:      ${call.side}`)
  console.log(`  P(${call.side}):    ${(call.selectedSideProb * 100).toFixed(0)}%`)
  console.log(`  Market:    ${(call.marketImpliedYes * 100).toFixed(0)}% YES`)
  console.log(`  Edge:      ${(call.edge * 100).toFixed(1)}pts`)
  console.log(`  Bond:      ${call.bondUsdc.toFixed(2)} USDC`)
  console.log(`\nTHESIS:`)
  console.log(`  ${call.locked.thesis}`)
  console.log(`\nCOUNTERARGUMENTS:`)
  console.log(`  ${call.locked.counterarguments}`)

  if (persist) {
    addCall(call)
    console.log(`\n✓ saved to .crossfire/calls.json — refresh the landing to see it.`)
  } else {
    console.log(`\n(dry-run — not saved. add --save to persist.)`)
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
