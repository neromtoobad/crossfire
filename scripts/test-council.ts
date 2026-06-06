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

async function main() {
  const marketId = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'btc-200k-2026'
  const persist = process.argv.includes('--save')
  const stubEvidence = process.argv.includes('--stub-evidence')

  console.log('\nPhase 8.3 — council test\n' + '─'.repeat(80))
  console.log(`  market:    ${marketId}`)
  console.log(`  evidence:  ${stubEvidence ? 'STUB (no x402 buys)' : 'LIVE x402 — 4 buys × 0.5 USDC'}`)
  console.log(`  persist:   ${persist ? 'YES (writes to .crossfire/calls.json)' : 'no (dry-run)'}\n`)

  const call = await runCouncil(marketId, {
    persist,
    stubEvidence,
    onEvent: (e) => {
      switch (e.type) {
        case 'started':
          console.log(`▸ started · "${e.marketTitle}" · impliedYes ${(e.impliedProbYes * 100).toFixed(0)}%`)
          break
        case 'treasury-mandate-signed':
          console.log(`▸ council treasury mandate signed`)
          break
        case 'role-evidence':
          console.log(`▸ ${e.role.padEnd(12)} x402: ${e.signal.padEnd(8)} ${e.sourceUrl.slice(0, 50)}… · spent ${e.usdcSpent} USDC`)
          break
        case 'role-vote':
          console.log(`▸ ${e.vote.role.padEnd(12)} vote:  ${e.vote.vote.padEnd(8)} ${(e.vote.confidence * 100).toFixed(0)}% — ${e.vote.oneLiner.slice(0, 100)}`)
          break
        case 'majority':
          console.log(`▸ majority: ${e.side} (${e.agreeing}/${e.total} agreed)`)
          break
        case 'skeptic-verdict':
          console.log(`▸ Skeptic     refutation conf ${(e.vote.confidence * 100).toFixed(0)}% — ${e.vote.oneLiner.slice(0, 100)}`)
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
  console.log(`  Side:        ${call.side}`)
  console.log(`  P(${call.side}):      ${(call.selectedSideProb * 100).toFixed(0)}%`)
  console.log(`  Market:      ${(call.marketImpliedYes * 100).toFixed(0)}% YES`)
  console.log(`  Edge:        ${(call.edge * 100).toFixed(1)}pts`)
  console.log(`  Bond:        ${call.bondUsdc.toFixed(2)} USDC`)
  console.log(`  Evidence:    ${call.locked.evidenceUrls.length} source(s)`)
  console.log(`\nTHESIS:`)
  console.log(`  ${call.locked.thesis}`)
  console.log(`\nCOUNTERARGUMENTS:`)
  console.log(`  ${call.locked.counterarguments}`)

  if (persist) {
    console.log(`\n✓ saved to .crossfire/calls.json — refresh http://localhost:3000/ to see it.`)
  } else {
    console.log(`\n(dry-run — not saved. add --save to persist.)`)
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
