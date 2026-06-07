// Quick smoke test for the debate engine — streams a full 3-round debate
// to the console so we can eyeball the prose + position parsing.
//
//   npm run test:debate

import { runDebate } from '../lib/council/debate.js'

const evidenceStub: Record<string, string> = {
  MacroScout: 'Structural: institutional crypto adoption rising, regulatory clarity improving in 2026; pardon would carry political cost with the crypto-skeptic right.',
  NewsHawk: 'No confirmed pardon-application activity; DOJ statements remain victims-first; pardon attorney pipeline committed elsewhere.',
  CrowdPulse: 'Crypto Twitter overwhelmingly anti-pardon; sentiment composite ~78% NO over 14 days.',
  BookWatcher: 'Market at 21% YES looks overpriced vs historical base rates for symbolic pardons (resolved NO ~90% historically).',
}

async function main() {
  const out = await runDebate({
    marketTitle: 'Will Trump pardon Sam Bankman-Fried?',
    impliedProbYes: 0.21,
    evidenceFor: (role) => evidenceStub[role] ?? '',
    emit: (e) => {
      if (e.type === 'debate-round') process.stdout.write(`\n\n═══ ROUND ${e.round}: ${e.title} ═══\n`)
      else if (e.type === 'debate-turn-start') process.stdout.write(`\n▸ ${e.role}: `)
      else if (e.type === 'debate-token') process.stdout.write(e.token)
      else if (e.type === 'debate-turn-end') process.stdout.write(`   «${e.vote} @ ${e.confidence}»`)
    },
  })
  console.log('\n\n── FINAL VOTES ───────────────────────────────────────')
  for (const v of out.roleVotes) console.log(`  ${v.role.padEnd(12)} ${v.vote.padEnd(8)} @ ${(v.confidence * 100).toFixed(0)}%  ${v.oneLiner.slice(0, 70)}`)
  console.log(`  ${'Skeptic'.padEnd(12)} refute @ ${(out.skepticVote.confidence * 100).toFixed(0)}%  ${out.skepticVote.oneLiner.slice(0, 70)}`)
}

main().catch((e) => { console.error('\nFATAL:', e); process.exit(1) })
