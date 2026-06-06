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

  bondTxHash?: `0x${string}`      // ERC-7710 redemption that posted the bond (Phase 8.6)
  bondHolder?: `0x${string}`      // address holding the bond until resolution

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
  // ── Sports (FIFA World Cup 2026) ────────────────────────────────────────
  {
    id: 'call-wc-argentina-001',
    marketId: 'wc-argentina-2026',
    marketTitle: 'Will Argentina win the 2026 FIFA World Cup?',
    marketAddress: '0xc2384369ad925fe5570e1b6311d84be21a7ac7a7',
    side: 'NO',
    selectedSideProb: 0.68,
    marketImpliedYes: 0.42,
    edge: 0.10,
    bondUsdc: 3.5,
    unlockUsdc: 0.10,
    publishedAt: NOW - 1 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.62, oneLiner: 'Reigning champions historically underperform: only 1 of the last 8 winners retained. Squad ageing, no clear striker behind Messi.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.66, oneLiner: 'CONMEBOL qualifiers showed Argentina has lost defensive solidity post-2022. Two recent friendlies ended in draws against mid-tier sides.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.58, oneLiner: 'Heavy Argentina-favored sentiment driven by Messi nostalgia — classic recency bias.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.71, oneLiner: 'Polymarket / Kalshi composite implies 22%, market here at 42% looks emotionally overpriced.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.38, oneLiner: 'Refutation thin: Messi at his peak could carry the team again. We weight that at ~30%.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'Market prices Argentina at 42% likely to retain — the council reads 32% (a 10-point edge toward NO). Reigning World Cup champions have a brutal historical record: only Italy (1934-38) and Brazil (1958-62) ever back-to-backed. The 2022 squad was already at the older end and 4 of the starting 11 will be 35+ by kickoff. Argentina also drew their last two qualifiers, suggesting the post-Qatar emotional peak is behind them. The Skeptic correctly notes Messi himself could rewrite the script — we weight that at ~30%, which is exactly why we hedge at 68% NO rather than 80%.',
      evidenceUrls: [
        { label: 'FIFA historical retention rate dataset', url: 'https://fifa.com', signal: 'NO' },
        { label: 'CONMEBOL qualifier results (past 6 matches)', url: 'https://conmebol.com', signal: 'NO' },
        { label: 'Polymarket WC futures composite', url: 'https://polymarket.com', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3.5 USDC — moderate. Sports markets carry single-event variance, and the edge is real but not huge.',
      counterarguments: 'Messi healthy + Mac Allister-Fernandez midfield maturation could absolutely close the gap. The dark-horse scenario: Argentina draws an easy group, builds momentum, Messi peaks. ~30% probability.',
    },
  },
  {
    id: 'call-wc-messi-001',
    marketId: 'wc-messi-scores',
    marketTitle: 'Will Lionel Messi score at the 2026 World Cup?',
    marketAddress: '0x94612810486b526e26acc2ec848b4ba42181249a',
    side: 'YES',
    selectedSideProb: 0.83,
    marketImpliedYes: 0.71,
    edge: 0.12,
    bondUsdc: 4.5,
    unlockUsdc: 0.10,
    publishedAt: NOW - 3 * 3600 * 1000,
    publishedBy: 'Council-B',
    votes: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.79, oneLiner: 'Messi has scored in every WC he\'s played. Even in 2010 (his weakest tournament) he had goal contributions.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.85, oneLiner: 'Messi confirmed match-fit through Inter Miami last season; Scaloni built the system around him.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.82, oneLiner: 'Books, X, and Polymarket all skew strongly toward Messi-scores; minimal disagreement.' },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.86, oneLiner: 'Market 71% looks light — historical rate for an in-form Messi is closer to 90%.' },
      { role: 'Skeptic', vote: 'YES', confidence: 0.18, oneLiner: 'Best refutation: injury in group stage forces early exit. <15% based on his recent fitness history.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'Strong consensus call. Messi has scored at every World Cup he participated in (2006, 2010, 2014, 2018, 2022 — 13 goals across them combined) and remains tactically central to the Argentine setup. Market pricing 71% under-weights how reliable he is once on the pitch. The only real path to NO is an early injury before he can take a penalty or shoot from a set-piece. Inter Miami load management has reduced minutes but kept him sharp. The Skeptic\'s refutation requires both injury AND early Argentina exit; we estimate this joint probability at <15%.',
      evidenceUrls: [
        { label: 'Messi WC goal history (Transfermarkt)', url: 'https://transfermarkt.com', signal: 'YES' },
        { label: 'Inter Miami injury bulletin (last 12 months)', url: 'https://intermiamicf.com', signal: 'YES' },
        { label: 'Polymarket Messi-scores market', url: 'https://polymarket.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 4.5 USDC — high confidence × moderate edge. Confidence is the dominant signal.',
      counterarguments: 'Injury before group stage (~8%) or Argentina eliminated in opening match without Messi scoring (~6%). Neither is independently very likely.',
    },
  },
  {
    id: 'call-wc-final-pks-001',
    marketId: 'wc-final-penalties',
    marketTitle: 'Will the 2026 World Cup final go to penalties?',
    marketAddress: '0x49a8401f3f46bca21e1f149665fcc948d5a0ebc8',
    side: 'NO',
    selectedSideProb: 0.78,
    marketImpliedYes: 0.34,
    edge: 0.12,
    bondUsdc: 3.5,
    unlockUsdc: 0.10,
    publishedAt: NOW - 7 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.74, oneLiner: 'Historical base rate: only 3 of the last 22 WC finals went to penalties. ~14%.' },
      { role: 'NewsHawk', vote: 'NEUTRAL', confidence: 0.5, oneLiner: 'No structural changes to WC rules. Slight scoring uptick across recent tournaments.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.6, oneLiner: 'Sports Twitter trending "2022 sequel" narrative — drives noise toward YES.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.71, oneLiner: 'Market at 34% sits ~20pts above the long-run rate; emotional, not statistical.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.32, oneLiner: 'Refutation: scoring rates have been creeping up + 2022 set the precedent. We weight that at 22%.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'Base-rate call. Only 3 of the last 22 World Cup finals (1994, 2006, 2022) ended in penalty shootouts — 14% historical rate, with no structural reason to expect that to change. Market at 34% appears to be pricing recency bias from the dramatic 2022 final. We read 22% likely (NO at 78%) to bake in the slow upward trend in late-tournament scoring and the modest rule changes around extra time. The Skeptic\'s refutation that another 2022-style classic is possible — fair, but pricing it at >30% is excessive.',
      evidenceUrls: [
        { label: 'WC final results 1930-2022 (FIFA)', url: 'https://fifa.com', signal: 'NO' },
        { label: 'Goals-per-game trend (Opta)', url: 'https://optasports.com', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3.5 USDC — base-rate calls with thin edges merit moderate sizing.',
      counterarguments: 'Two top-tier sides reaching the final could play a defensive, low-scoring game that ends 0-0 after 120m. Probability ~22%.',
    },
  },
  // ── Crypto ─────────────────────────────────────────────────────────────
  {
    id: 'call-sol-flip-001',
    marketId: 'sol-flip-eth-2026',
    marketTitle: 'Will Solana flip Ethereum on market cap in 2026?',
    marketAddress: '0x1685bdfbf4d229e079e3d83b669a2b4dd399c8bd',
    side: 'NO',
    selectedSideProb: 0.81,
    marketImpliedYes: 0.28,
    edge: 0.09,
    bondUsdc: 3.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 11 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.78, oneLiner: 'ETH market cap roughly 2.4x SOL. Would need SOL to outperform ETH by ~140% within 12 months — historically rare for #1 chain.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.66, oneLiner: 'No catalyst pipeline strong enough to drive that gap closure: ETF flows favor ETH, restaking unlocks favor ETH.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.55, oneLiner: 'Crypto Twitter SOL maxis loud, but ETH ETF holders are quiet money — sentiment doesn\'t price markets.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.74, oneLiner: 'Perp basis on SOL/ETH ratio shows positioning is balanced, not crowded long-SOL.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.31, oneLiner: 'Refutation: a meme-rotation event + ETH ETF outflows could compress the gap fast. ~22%.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'A 140% ETH-relative outperformance for SOL in one year is extreme but not impossible. Council reads ~19% likely (NO at 81%). The bull case requires (1) sustained meme/launchpad activity routing through Solana, (2) ETH ETF outflows, and (3) no major SOL outages. All three holding for 12 months is the long tail. Market at 28% is closer to right than wrong but still too generous.',
      evidenceUrls: [
        { label: 'CoinGecko ETH/SOL market cap ratio (5y)', url: 'https://coingecko.com', signal: 'NO' },
        { label: 'ETH ETF cumulative flows', url: 'https://farside.co.uk', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3 USDC. Thin edge over a fast-moving market — undersized to protect treasury Brier on crypto volatility.',
      counterarguments: 'Strong meme cycle + a single ETH bad-news catalyst could close the gap fast. We rate this at ~22%.',
    },
  },
  // ── Tech ───────────────────────────────────────────────────────────────
  {
    id: 'call-apple-fold-001',
    marketId: 'apple-fold-2026',
    marketTitle: 'Will Apple ship a foldable iPhone in 2026?',
    marketAddress: '0x2bf8de1c7c53893e7909fc1712afa6d537d23f05',
    side: 'NO',
    selectedSideProb: 0.74,
    marketImpliedYes: 0.39,
    edge: 0.13,
    bondUsdc: 3.5,
    unlockUsdc: 0.10,
    publishedAt: NOW - 16 * 3600 * 1000,
    publishedBy: 'Council-B',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.72, oneLiner: 'Apple has never first-mover\'d a form factor. Samsung\'s 6-year head start hasn\'t shifted Apple\'s posture.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.77, oneLiner: 'Latest credible supply-chain leaks (TF International) point to 2027 ship at earliest.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.58, oneLiner: 'Tech YouTubers + clickbait have been hyping foldable iPhone for years — sentiment chases attention.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.69, oneLiner: 'Market 39% reflects hype premium, not supply-chain reality.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.27, oneLiner: 'Refutation: a surprise WWDC reveal + Q4 shipment is possible. ~26%.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'Council reads ~26% likely (NO at 74%). Apple\'s product pattern has been to wait until a category matures, then ship best-in-class — they did this with smartwatches (Pebble first, Apple 4 years later) and AR/VR (Meta years before Vision Pro). Foldables are still maturing; Samsung\'s screen-crease issues haven\'t resolved cleanly. Credible supply-chain leaks point to 2027. Market at 39% is the noise from rumor cycles, not signal.',
      evidenceUrls: [
        { label: 'Ming-Chi Kuo foldable timeline (TF International)', url: 'https://9to5mac.com', signal: 'NO' },
        { label: 'Apple product release cadence dataset', url: 'https://apple.com/newsroom', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3.5 USDC. Tech timing markets carry catalyst risk — moderate sizing.',
      counterarguments: 'Apple could surprise at fall event 2026; a holiday ship would resolve YES. ~26%.',
    },
  },
  // ── Macro ──────────────────────────────────────────────────────────────
  {
    id: 'call-us10y-001',
    marketId: 'us-10y-above-5',
    marketTitle: 'Will the US 10-year Treasury yield close above 5% in 2026?',
    marketAddress: '0xc915dd8c6ed2f4210235d552c6ac5b38a9d0bf50',
    side: 'NO',
    selectedSideProb: 0.66,
    marketImpliedYes: 0.45,
    edge: 0.11,
    bondUsdc: 3.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 19 * 3600 * 1000,
    publishedBy: 'Council-A',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.64, oneLiner: 'Real rates near 2.1% already at cycle high. Re-acceleration unlikely without inflation re-flare; CPI trending sideways.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.61, oneLiner: 'Fed minutes lean dovish; Treasury financing pressure modulating with debt-issuance shifts toward bills.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.55, oneLiner: 'Hedge fund X timelines split — leverage long positioning in 10y futures rising.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.69, oneLiner: 'Eurodollar futures price ~4.55% terminal — material gap to 5%.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.41, oneLiner: 'Borderline: fiscal-spending shock or supply shock could spike yields fast. We weight that at 33%.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'A thin-edge macro call. Market prices 5% touch at 45%, council reads 34% (NO at 66%). The dovish path holds: inflation drift sideways, Fed willing to cut, supply pressures eased by issuance shifts. The bear-bond case (5%+) requires a fiscal shock or oil shock. We give that 33% — material but minority. We bond small (3 USDC) because thin edges on macro carry tail-event downside.',
      evidenceUrls: [
        { label: 'US 10Y historical + Fed projections', url: 'https://www.federalreserve.gov', signal: 'NO' },
        { label: 'CME FedWatch terminal rate', url: 'https://www.cmegroup.com', signal: 'NO' },
        { label: 'Treasury TBAC quarterly refunding statement', url: 'https://treasurydirect.gov', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3 USDC. The Skeptic explicitly noted borderline — we honor that with smaller treasury exposure.',
      counterarguments: 'A real fiscal blowout (large unfunded tax cuts) or geopolitical oil shock pushes 10y past 5% inside weeks. ~33%.',
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
    return [...stored, ...SAMPLE_CALLS].slice(0, 24)
  } catch {
    return SAMPLE_CALLS
  }
}

export function getCallById(id: string): PublishedCall | undefined {
  // Server-side: search live store first, then fall back to samples.
  if (typeof process !== 'undefined' && typeof window === 'undefined') {
    try {
      const mod = require('./calls-store.js') as typeof import('./calls-store.js')
      const stored = mod.loadStoredCalls()
      const fromStore = stored.find((c) => c.id === id)
      if (fromStore) return fromStore
    } catch { /* fall through */ }
  }
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
