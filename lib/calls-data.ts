// Published-call shape + sample seed data.
//
// In Phase 8.2 the council will write real published calls into
// .crossfire/calls.json — and lib/calls-store.ts will replace this stub.
// For Phase 8.1 we hand-craft 4 realistic-looking calls so the product
// is legible immediately, before any new agent code lands.

export type AgentRole = 'MacroScout' | 'NewsHawk' | 'CrowdPulse' | 'BookWatcher' | 'Skeptic'

export type AgentVote = {
  role: AgentRole
  vote: 'YES' | 'NO' | 'ABSTAIN'
  confidence: number  // 0-1
  oneLiner: string    // 1-2 sentence public summary (free to read)
}

export type PublishedCall = {
  id: string
  marketId: string                // matches lib/markets.json
  marketTitle: string
  marketAddress: `0x${string}`

  side: 'YES' | 'NO'              // the side the council recommends
  selectedSideProb: number        // 0-1, council's estimate for the SELECTED side
  marketImpliedYes: number        // 0-1, market's price at publish time
  edge: number                    // selectedSideProb - marketImpliedYes (or 1-... for NO)

  bondUsdc: number                // size of the agent's on-chain bond
  unlockUsdc: number              // user pays this to unlock the full thesis

  bondTxHash?: `0x${string}`      // when published on-chain (Phase 8.3)

  publishedAt: number             // unix ms
  publishedBy: string             // agent desk handle (e.g., "Council-A")

  // PUBLIC fields (free)
  votes: AgentVote[]              // each agent's vote + one-line
  skepticVerdict: 'APPROVED' | 'VETOED'

  // LOCKED fields (paid to read)
  locked: {
    thesis: string                // full multi-paragraph reasoning
    evidenceUrls: Array<{ label: string; url: string; signal: 'YES' | 'NO' | 'NEUTRAL' }>
    sizingRationale: string       // why this bond size
    counterarguments: string      // the strongest case AGAINST
  }
}

// ── 4 hand-crafted sample calls (Phase 8.1) ──────────────────────────────
// Maps to the 4 markets in lib/markets.json by marketId.
// Realistic enough to demo against, intentionally NOT real council output —
// the bond tx fields are absent because nothing's on-chain yet.

const NOW = 1780_700_000_000  // a fixed timestamp so SSR is deterministic

export const SAMPLE_CALLS: PublishedCall[] = [
  {
    id: 'call-btc-200k-001',
    marketId: 'btc-200k-2026',
    marketTitle: 'Will Bitcoin hit $200,000 by Dec 31, 2026?',
    marketAddress: '0xe4fe1aa438d1053d4e8a6976ec509708ae8719ab',
    side: 'YES',
    selectedSideProb: 0.76,
    marketImpliedYes: 0.58,
    edge: 0.18,
    bondUsdc: 5.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 2 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.78, oneLiner: 'ETF inflows printed an ATH last week and miner capitulation is structurally complete — macro setup is bullish.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.72, oneLiner: 'Recent Kalshi court victory expands regulated venues; BTC ETF approvals continue to widen distribution.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.71, oneLiner: 'Long/short ratio on perps tilted bullish but not crowded; funding rates moderate, not euphoric.' },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.75, oneLiner: 'Market price 58% leaves real edge for YES given evidence weight and historical drift in BTC vs targets.' },
      { role: 'Skeptic', vote: 'YES', confidence: 0.20, oneLiner: 'Best refutation: a regulatory shock from EU could derail; weighted evidence still outvotes that risk.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'BTC is currently priced at 58% likelihood of hitting $200k by end-2026, but the council reads 76%. The 18-point edge derives from three converging signals: (1) institutional flows via BlackRock IBIT crossed $40B AUM last week, with weekly inflows at all-time highs and no observable rate-limiting from custodial constraints; (2) the regulatory tailwind from CFTC clarifying prediction-market status, combined with Kalshi expanding event contracts onto BTC-correlated outcomes, increases on-ramp diversity; (3) on the price-action side, the BTC dominance ratio has held above 58% through the alt rotation, which historically correlates with sustained majors rallies. Counter-arguments stress that 12 months is long and an EU regulatory tightening could compress liquidity, but the council weights this at 20-25% probability of materializing in time to matter.',
      evidenceUrls: [
        { label: 'BlackRock IBIT 13F Q1 holdings disclosure', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany', signal: 'YES' },
        { label: 'CFTC press release on prediction markets', url: 'https://www.cftc.gov/PressRoom', signal: 'YES' },
        { label: 'Glassnode miner net position change', url: 'https://glassnode.com', signal: 'YES' },
        { label: 'Chainalysis Q4 institutional flows report', url: 'https://chainalysis.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond sized at 5 USDC — the floor for medium-conviction calls. Council confidence 76% with 18-point edge falls in the middle band of the sizing matrix; a 80%+ confidence call would step up to 10 USDC.',
      counterarguments: 'Most credible bear case: a fed-induced risk-off shock in Q3 could halve BTC and lock in the implied probability at <40% before recovery time exists. We rate this at ~22% likelihood. A separate risk is that the EU MiCA enforcement regime adds friction that re-prices ETF custody premiums upward.',
    },
  },
  {
    id: 'call-trump-pardon-001',
    marketId: 'trump-sbf-pardon',
    marketTitle: 'Will Trump pardon Sam Bankman-Fried?',
    marketAddress: '0xa06d034fcaf738784d4670b9145c6c0f6d0b12dc',
    side: 'NO',
    selectedSideProb: 0.79,
    marketImpliedYes: 0.21,
    edge: 0.21,
    bondUsdc: 4.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 5 * 3600 * 1000,
    publishedBy: 'Council-B',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.74, oneLiner: 'Pardon would create political cost with the crypto-skeptic right; victims-rights framing dominates current admin signaling.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.81, oneLiner: 'No verified pardon-application activity. Current pardon attorney pipeline is committed to other candidates per recent leaks.' },
      { role: 'CrowdPulse', vote: 'NO', confidence: 0.69, oneLiner: 'Crypto Twitter overwhelmingly anti-pardon; polymarket-mentions sentiment 78% NO over last 14 days.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.83, oneLiner: 'Market at 21% YES is overpriced; historical similar markets resolved NO at 90%+ when polymarket spent >6 months below 35%.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.15, oneLiner: 'Refutation thin: only a back-channel pardon-quid-pro-quo could flip this; that scenario has no public surface area.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'The market prices a 21% probability of a pardon. Council reads 21% YES is overpriced — true probability nearer 5-8%, so the selected side NO sits at ~92-95%. We report 79% NO (a conservative 21% edge) to bake in scenario uncertainty. Reasoning: (1) every public administration signal on SBF has been victims-first framing; (2) prediction markets historically over-price politically symbolic events because of headline-buy noise; (3) FTX restitution proceedings are still active and creditor positioning would punish a pardon politically.',
      evidenceUrls: [
        { label: 'DOJ statements on SBF case — past 90 days', url: 'https://www.justice.gov', signal: 'NO' },
        { label: 'Federalist Society panel on crypto-fraud sentencing', url: 'https://fedsoc.org', signal: 'NO' },
        { label: 'Crypto Twitter sentiment composite (CrowdPulse internal)', url: 'https://example.com', signal: 'NO' },
      ],
      sizingRationale: 'Bond 4 USDC. Confidence high but edge is also large — a wide edge with high confidence justifies elevated bond. Capped at 4 USDC by current council treasury policy.',
      counterarguments: 'The dark-horse path: a backchannel from a wealthy SBF advocate or family connection could reach the pardon attorney without leaving paper trail until announcement. We rate this at <5% but it is the only path; it explains why we don\'t go to 90%+ confidence on the call.',
    },
  },
  {
    id: 'call-gpt6-001',
    marketId: 'openai-gpt6-2026',
    marketTitle: 'Will OpenAI release GPT-6 in 2026?',
    marketAddress: '0x10d7cdf75e2ccca0d23234b295797e0761056888',
    side: 'YES',
    selectedSideProb: 0.71,
    marketImpliedYes: 0.56,
    edge: 0.15,
    bondUsdc: 3.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 9 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.68, oneLiner: 'OpenAI fundraising at $300B valuation requires release-cadence narrative; GPT-6 launch is the natural inflection.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.74, oneLiner: 'Multiple leaks of new training runs at unprecedented FLOP counts; Microsoft Azure GPU allocation increased 3.2x.' },
      { role: 'CrowdPulse', vote: 'NEUTRAL', confidence: 0.52, oneLiner: 'Crypto/AI Twitter split on naming convention — some predict "GPT-5.5" branding instead of GPT-6.' },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.71, oneLiner: 'Market 56% leaves ~15pt edge given evidence weight; previous GPT releases were systematically under-priced by 8-12% on Polymarket.' },
      { role: 'Skeptic', vote: 'YES', confidence: 0.32, oneLiner: 'Best refutation: branding ambiguity (a "GPT-5.5" or "o4-pro" release could technically not count). Edge still positive but lower confidence.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'The council reads GPT-6 release in 2026 at 71% likely, against market 56%. Edge of 15 points is justified by Microsoft\'s 3.2x increase in Azure GPU allocation to OpenAI training (visible in cloud-spend filings), multiple credible leaks of training runs at 10x previous compute, and pressure on OpenAI to maintain release cadence as competitive positioning. The Skeptic\'s lower confidence reflects genuine naming-convention risk: if OpenAI brands the next release "o5" or "GPT-5.5", a strict reading of "GPT-6" resolves NO. Resolution dispute risk is real and lowers our confidence below what evidence weight alone would suggest.',
      evidenceUrls: [
        { label: 'Microsoft Q1 cloud-allocation breakdown', url: 'https://microsoft.com/investor', signal: 'YES' },
        { label: 'OpenAI training-run leak coverage', url: 'https://example.com', signal: 'YES' },
        { label: 'Polymarket historical AI-release resolution log', url: 'https://polymarket.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 3 USDC. Medium-confidence call with material resolution-naming risk; bond intentionally below the BTC call (5) and SBF call (4).',
      counterarguments: 'Two real downside paths: (1) OpenAI delays to early 2027 if safety-alignment work blocks release; (2) the model launches as "o5-flagship" and the market resolves NO on a technicality. We estimate (1) at 18% and (2) at 11%.',
    },
  },
  {
    id: 'call-fed-001',
    marketId: 'fed-rate-cut',
    marketTitle: 'Will the Fed cut rates at the next FOMC meeting?',
    marketAddress: '0x8d0b92549ecdc9668becd97cee2090db9dc7c12c',
    side: 'NO',
    selectedSideProb: 0.59,
    marketImpliedYes: 0.50,
    edge: 0.09,
    bondUsdc: 2.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 14 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.62, oneLiner: 'Recent CPI print at 3.1% YoY keeps hawkish wing of FOMC vocal; dots show split committee.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.58, oneLiner: 'Fed speakers in past 14 days lean hold-and-see; Waller and Bowman both signaled hold preference.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.55, oneLiner: 'Rates market pricing 56% probability of cut; retail bond traders positioned for cut.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.61, oneLiner: 'Edge thin but real — market at 50/50 and labor-market resilience supports NO at slight edge.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.41, oneLiner: 'Refutation valid: edge is small (9pt) and macro data could flip in the next 2 weeks. Borderline approval.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'A genuinely close call. The Fed-cut market is at 50/50 and the council reads only a 9-point edge toward NO. The case for NO rests on three pieces: persistent core CPI above target, vocal hawkish wing in recent speeches, and labor-market resilience. The case AGAINST publishing this call is the same as the case for publishing — thin edges expose us to noise. We bond it only at 2 USDC reflecting the borderline conviction.',
      evidenceUrls: [
        { label: 'Latest CPI release (BLS)', url: 'https://www.bls.gov', signal: 'NO' },
        { label: 'Fed-speak digest (past 14 days)', url: 'https://example.com', signal: 'NO' },
        { label: 'CME FedWatch tool', url: 'https://www.cmegroup.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 2 USDC — the council\'s minimum for borderline calls. The Skeptic explicitly noted this is a thin-edge approval; smaller bond protects the treasury Brier score from low-conviction misses.',
      counterarguments: 'If labor data weakens between now and the FOMC meeting, the dovish wing gains votes overnight. The 9-point edge could collapse in a single data print.',
    },
  },
]

export function loadCalls(): PublishedCall[] {
  // Server-side: stored calls take precedence; samples back-fill so the feed
  // is never empty during early demos.
  if (typeof process === 'undefined' || typeof window !== 'undefined') {
    return SAMPLE_CALLS
  }
  try {
    // Defer import so client bundle isn't dragged into reading fs.
    const mod = require('./calls-store.js') as typeof import('./calls-store.js')
    const stored = mod.loadStoredCalls()
    if (stored.length === 0) return SAMPLE_CALLS
    return [...stored, ...SAMPLE_CALLS].slice(0, 12)
  } catch {
    return SAMPLE_CALLS
  }
}

export function getCallById(id: string): PublishedCall | undefined {
  return SAMPLE_CALLS.find((c) => c.id === id)
}

export function relativeTime(ms: number): string {
  const delta = Date.now() - ms
  const hr = Math.floor(delta / 3600000)
  if (hr < 1) return 'just now'
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}
