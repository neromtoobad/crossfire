// Published-call shape + sample seed data.
//
// In Phase 8.2 the council will write real published calls into
// .crossfire/calls.json — and lib/calls-store.ts will replace this stub.
// For Phase 8.1 we hand-craft 4 realistic-looking calls so the product
// is legible immediately, before any new agent code lands.

// World Cup group-stage fixtures (72 matches), generated deterministically.
// wc-fixtures imports only TYPES from here, so there's no runtime cycle.
import { FIXTURE_CALLS } from './wc-fixtures.js'
import { HISTORICAL_CALLS } from './historical-matches.js'

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

  // OPTIONAL — live overlay from Polymarket Gamma. Attached server-side in
  // loadCalls() when the market has a polymarketSlug. The card uses this
  // to render "vs Polymarket X%" alongside (or instead of) the chain price.
  livePolymarket?: { yes: number; slug: string; question?: string }

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
    id: 'call-wc-bra-fra-001',
    marketId: 'wc-bra-fra-qf',
    marketTitle: 'Brazil to beat France in the quarter-final?',
    marketAddress: '0xe4fe1aa438d1053d4e8a6976ec509708ae8719ab',
    side: 'NO',
    selectedSideProb: 0.62,
    marketImpliedYes: 0.46,
    edge: 0.08,
    bondUsdc: 5.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 2 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.66, oneLiner: 'France sit deeper and spring Mbappé in transition — that shape has Brazil’s high line in trouble all night.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.58, oneLiner: 'Word from the camp: Brazil have a fully fit front three for the first time this tournament; France carry a knock at the back.' },
      { role: 'CrowdPulse', vote: 'NO', confidence: 0.61, oneLiner: 'France have that quiet knockout swagger; Brazil’s crowd turns on them the moment it gets tight.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.64, oneLiner: 'France’s xG-against in the knockouts is elite; the line at 46% YES over-rates Brazil’s open-play threat.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.34, oneLiner: 'Best case for Brazil is a set-piece night, but one corner doesn’t beat France’s transition — panel holds.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'The line prices Brazil to win at 46%, but the panel reads NO (France or a draw inside 90) at 62%. France’s knockout identity — sit at 4-4-2, deny the half-spaces, and break through Mbappé — has repeatedly neutralised possession-heavy sides, and Brazil’s high defensive line is exactly the profile France punish. The one real Brazil path is a set-piece-led night, but the data desk has France’s xG-against among the lowest of any side still in the tournament.',
      evidenceUrls: [
        { label: 'FBref — France knockout xG/xGA splits', url: 'https://fbref.com', signal: 'NO' },
        { label: 'Opta — Brazil high-line vs counter-attacking sides', url: 'https://theanalyst.com', signal: 'NO' },
        { label: 'Team news: Brazil front three fitness', url: 'https://www.fifa.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 5 USDC — a medium-conviction knockout call (62% with an 8-point edge over the line). A 70%+ read would step up to 10.',
      counterarguments: 'Strongest Brazil case: a fully fit front three plus a France centre-back carrying a knock could flip the matchup, especially if Brazil get an early set-piece. The panel rates that path ~38%.',
    },
  },
  {
    id: 'call-wc-mbappe-boot-001',
    marketId: 'wc-mbappe-golden-boot',
    marketTitle: 'Mbappé to win the Golden Boot?',
    marketAddress: '0xa06d034fcaf738784d4670b9145c6c0f6d0b12dc',
    side: 'YES',
    selectedSideProb: 0.64,
    marketImpliedYes: 0.41,
    edge: 0.18,
    bondUsdc: 4.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 5 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.66, oneLiner: 'France are built to go deep and he takes the pens — more knockout minutes than any rival striker means more chances.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.7, oneLiner: 'He’s on penalties and free-kicks for France; no fitness flag, and his main rival picked up a knee knock in the group stage.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.62, oneLiner: 'Big-stage Mbappé is a different animal — the lad turns up when the lights are brightest.' },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.63, oneLiner: 'Leads the field on xG + shot volume; the 41% line under-rates a striker on spot-kicks for a finalist contender.' },
      { role: 'Skeptic', vote: 'YES', confidence: 0.3, oneLiner: 'Golden Boots get stolen by a hat-trick from nowhere — but the volume case is strong, I’ll allow it.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'The line has Mbappé at 41% for the Golden Boot; the panel reads 64%. Two structural edges: he takes France’s penalties and free-kicks, and France are among the few sides likely to play the maximum number of knockout games — more minutes, more chances, more spot-kicks than any rival striker. The numbers desk has him top of the field on combined xG and shot volume.',
      evidenceUrls: [
        { label: 'FBref — tournament xG + shots leaderboard', url: 'https://fbref.com', signal: 'YES' },
        { label: 'France set-piece + penalty duties', url: 'https://www.fifa.com', signal: 'YES' },
        { label: 'Rival striker injury report', url: 'https://www.skysports.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 4 USDC — a strong-conviction goals market (64% vs a 41% line). Outright/Golden-Boot markets carry variance, so it sits below a 10 USDC match call.',
      counterarguments: 'The Boot is high-variance: a single hat-trick from an outsider, or France going out early, flips it. The panel rates that tail ~36%.',
    },
  },
  {
    id: 'call-wc-eng-esp-001',
    marketId: 'wc-eng-esp-goals',
    marketTitle: 'England vs Spain: over 2.5 goals?',
    marketAddress: '0x10d7cdf75e2ccca0d23234b295797e0761056888',
    side: 'NO',
    selectedSideProb: 0.6,
    marketImpliedYes: 0.52,
    edge: 0.12,
    bondUsdc: 3.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 9 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.64, oneLiner: 'Two cagey managers in a knockout — both sit off, both kill the midfield. This is a 1-0, not a basketball match.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.55, oneLiner: 'Both first-choice keepers are doubts and Spain rest a centre-back — that could blow it open late.' },
      { role: 'CrowdPulse', vote: 'NO', confidence: 0.58, oneLiner: 'Knockout England means tight and nervy; nobody scores three when the fear of losing is this big.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.66, oneLiner: 'Combined knockout xG for both sides sits ~2.1; the over at 52% over-rates a low-tempo, low-shot matchup.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.38, oneLiner: 'A keeper howler ruins the under, but two safety-first sides won’t trade goals — panel’s right to back the under.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'The over/under sits at 52% over; the panel reads NO (under 2.5) at 60%. Both managers default to control in knockouts — deep blocks, midfield congestion, low shot volume. The numbers desk has the combined knockout xG around 2.1, below the 2.5 line, and England knockout games in particular skew tight and nervy.',
      evidenceUrls: [
        { label: 'Combined knockout xG / shots-on-target', url: 'https://fbref.com', signal: 'NO' },
        { label: 'Both keepers — fitness doubts', url: 'https://www.bbc.com/sport', signal: 'YES' },
        { label: 'England knockout goals-per-game history', url: 'https://www.opta.com', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3 USDC — a clean numbers-led under call with a 12-point edge, sized below a high-conviction outright.',
      counterarguments: 'If both first-choice keepers miss out, an early goal could stretch the game and force it open. That’s the live path to the over (~40%).',
    },
  },
  {
    id: 'call-wc-usa-qf-001',
    marketId: 'wc-usa-quarters-outright',
    marketTitle: 'Hosts USA to reach the quarter-finals?',
    marketAddress: '0x8d0b92549ecdc9668becd97cee2090db9dc7c12c',
    side: 'NO',
    selectedSideProb: 0.57,
    marketImpliedYes: 0.48,
    edge: 0.05,
    bondUsdc: 2.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 14 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.58, oneLiner: 'Home crowd carries them through the group, but the bracket hands them a top-eight side in the round of 16 — that’s the wall.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.56, oneLiner: 'Fully fit squad and a kind group draw; the hosts have the easiest path to the last 16 of any side here.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.6, oneLiner: 'You cannot price the home crowd — this team feeds off it and the country’s behind them.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.59, oneLiner: 'Group passage is ~80% on the numbers, but the round-of-16 opponent drags the parlay to ~48% — the line is fair-to-rich.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.44, oneLiner: 'Thin edge and a home crowd is a real factor — this is the borderline-est call on the board. Just about holds.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'A genuinely close one. The hosts are ~80% to clear a kind group, but reaching the quarters means winning a round-of-16 tie that the bracket likely pairs against a top-eight side. Multiply it through and the panel lands at 57% NO versus a 48% line — only a 5-point edge, so this is bonded small. The crowd is the live variable the numbers can’t fully price.',
      evidenceUrls: [
        { label: 'USA group + bracket projection', url: 'https://www.fifa.com', signal: 'NO' },
        { label: 'Host-nation home advantage study', url: 'https://www.opta.com', signal: 'YES' },
        { label: 'USA squad fitness report', url: 'https://www.espn.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 2 USDC — the floor. A 5-point edge is thin; THE PUNDIT flagged it as borderline, so the small stake protects the panel’s record.',
      counterarguments: 'A favourable round-of-16 draw plus the home crowd could easily flip this; the panel only edges it, and a single result settles it either way.',
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
    id: 'call-wc-spain-outright-001',
    marketId: 'wc-spain-winner-2026',
    marketTitle: 'Spain to lift the 2026 World Cup?',
    marketAddress: '0x1685bdfbf4d229e079e3d83b669a2b4dd399c8bd',
    side: 'NO',
    selectedSideProb: 0.74,
    marketImpliedYes: 0.22,
    edge: 0.04,
    bondUsdc: 3.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 11 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'NO', confidence: 0.7, oneLiner: 'Best football of the tournament, but their high line gets exposed by a transition side in a one-off knockout — that’s the ceiling.' },
      { role: 'NewsHawk', vote: 'NO', confidence: 0.6, oneLiner: 'A key midfielder is one yellow from suspension and the first-choice keeper has been shaky — that’s a knockout risk.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.58, oneLiner: 'This Spain side has the swagger and the togetherness of a tournament winner — I wouldn’t back against them.' },
      { role: 'BookWatcher', vote: 'NO', confidence: 0.68, oneLiner: 'They’re the model favourite, but 22% to win it outright is about fair — outright variance makes NO the value.' },
      { role: 'Skeptic', vote: 'NO', confidence: 0.4, oneLiner: 'They’re the best team and only edged here — a single bad knockout night ends it. Borderline, but it holds.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'Spain are the best side in the tournament and the model favourite — but "best team" and "wins a 7-game knockout" are different bets. The line has them 22% to lift it; the panel reads NO (anyone-but-Spain) at 74%, only a 4-point edge, because outright markets are pure variance. The live risks are a high line that transition sides can punish and a shaky keeper.',
      evidenceUrls: [
        { label: 'Tournament-winner model probabilities', url: 'https://www.opta.com', signal: 'NO' },
        { label: 'Spain pressing line vs counter-attacks', url: 'https://fbref.com', signal: 'NO' },
        { label: 'Suspension + keeper watch', url: 'https://www.bbc.com/sport', signal: 'NO' },
      ],
      sizingRationale: 'Bond 3 USDC. A thin 4-point edge on a high-variance outright — bonded conservatively.',
      counterarguments: 'If the draw is kind and the keeper settles, the best team in the tournament can absolutely win it; the panel only just edges this.',
    },
  },
  {
    id: 'call-wc-ger-group-001',
    marketId: 'wc-germany-group-d',
    marketTitle: 'Germany to win Group D?',
    marketAddress: '0x2bf8de1c7c53893e7909fc1712afa6d537d23f05',
    side: 'YES',
    selectedSideProb: 0.68,
    marketImpliedYes: 0.54,
    edge: 0.14,
    bondUsdc: 3.5,
    unlockUsdc: 0.10,
    publishedAt: NOW - 16 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.7, oneLiner: 'Strongest squad in the group by a distance; they control games and win the ones they’re supposed to win.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.72, oneLiner: 'Full-strength squad, no suspensions, and their toughest group rival is missing a first-choice centre-back.' },
      { role: 'CrowdPulse', vote: 'YES', confidence: 0.62, oneLiner: 'Tournament Germany find a gear in the group — expect them to top it and send a message.' },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.66, oneLiner: 'Highest projected points-per-game in the group; the 54% line under-rates the gap to the field.' },
      { role: 'Skeptic', vote: 'YES', confidence: 0.28, oneLiner: 'A shock opening-day draw is the only worry, and even then they’ve the goal difference to recover. I’ll allow it.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'Germany are the clear class of Group D — strongest squad, full availability, and the toughest rival weakened by a defensive injury. The line has them 54% to top the group; the panel reads 68%. The only realistic wobble is a flat opening result, which their goal difference would likely absorb.',
      evidenceUrls: [
        { label: 'Group D projected table', url: 'https://www.opta.com', signal: 'YES' },
        { label: 'Germany squad availability', url: 'https://www.fifa.com', signal: 'YES' },
        { label: 'Group rival injury report', url: 'https://www.kicker.de', signal: 'YES' },
      ],
      sizingRationale: 'Bond 3.5 USDC — a solid group-stage call (68% vs a 54% line) with the clear talent gap behind it.',
      counterarguments: 'An upset on matchday one plus a rival run could flip the top spot; the panel rates that tail ~32%.',
    },
  },
  {
    id: 'call-wc-ned-ger-001',
    marketId: 'wc-ned-ger-btts',
    marketTitle: 'Netherlands vs Germany: both teams to score?',
    marketAddress: '0xc915dd8c6ed2f4210235d552c6ac5b38a9d0bf50',
    side: 'YES',
    selectedSideProb: 0.65,
    marketImpliedYes: 0.55,
    edge: 0.1,
    bondUsdc: 3.0,
    unlockUsdc: 0.10,
    publishedAt: NOW - 19 * 3600 * 1000,
    publishedBy: 'The Panel',
    votes: [
      { role: 'MacroScout', vote: 'YES', confidence: 0.66, oneLiner: 'Two sides that commit full-backs and play on the front foot — this old rivalry is never a 1-0.' },
      { role: 'NewsHawk', vote: 'YES', confidence: 0.6, oneLiner: 'Both first-choice strikers fit and starting; neither defence is at full strength at the back.' },
      { role: 'CrowdPulse', vote: 'NO', confidence: 0.55, oneLiner: 'Rivalry games can tighten up — sometimes the fear of losing to THEM trumps the urge to attack.' },
      { role: 'BookWatcher', vote: 'YES', confidence: 0.67, oneLiner: 'Both teams’ BTTS rate this tournament is north of 60%; the 55% line slightly under-rates the open style.' },
      { role: 'Skeptic', vote: 'YES', confidence: 0.33, oneLiner: 'A red card or a park-the-bus plan kills it, but two attacking sides at full strength? Both score.' },
    ],
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: 'The Netherlands–Germany rivalry is historically open, and both sides commit full-backs and press high. With both first-choice strikers fit and neither back line at full strength, the panel reads both-teams-to-score at 65% versus a 55% line. The live risk is a cagey, fear-driven rivalry game or an early red card.',
      evidenceUrls: [
        { label: 'Both sides — tournament BTTS rate', url: 'https://fbref.com', signal: 'YES' },
        { label: 'Striker fitness + back-line availability', url: 'https://www.bbc.com/sport', signal: 'YES' },
        { label: 'NED–GER historical goals data', url: 'https://www.opta.com', signal: 'YES' },
      ],
      sizingRationale: 'Bond 3 USDC — a numbers-backed goals market with a 10-point edge over the line.',
      counterarguments: 'A tight, nervy rivalry game or an early sending-off flips it to NO; the panel rates that ~35%.',
    },
  },
]

// Collapse a call list to ONE call per market — the newest. The council
// appends a fresh call every run, so the same market can have several stored
// entries (plus a hand-crafted sample). The feed should show each market once.
function dedupeByMarket(calls: PublishedCall[]): PublishedCall[] {
  const newestByMarket = new Map<string, PublishedCall>()
  for (const c of calls) {
    const prev = newestByMarket.get(c.marketId)
    if (!prev || c.publishedAt > prev.publishedAt) newestByMarket.set(c.marketId, c)
  }
  return [...newestByMarket.values()].sort((a, b) => b.publishedAt - a.publishedAt)
}

export function loadCalls(): PublishedCall[] {
  // Server-side: stored calls take precedence; samples back-fill so the feed
  // is never empty during early demos.
  // marquee hand-authored calls first, then the real-result backtest matches
  // (the agents' graded record), then the upcoming 2026 group fixtures (pending).
  const seed = [...SAMPLE_CALLS, ...HISTORICAL_CALLS, ...FIXTURE_CALLS]
  if (typeof process === 'undefined' || typeof window !== 'undefined') {
    return dedupeByMarket(seed)
  }
  try {
    const mod = require('./calls-store.js') as typeof import('./calls-store.js')
    const stored = mod.loadStoredCalls()
    if (stored.length === 0) return dedupeByMarket(seed)
    // Stored first so a real published call wins over the sample for the same
    // market; dedupeByMarket then keeps the newest per market.
    return dedupeByMarket([...stored, ...seed]).slice(0, 200)
  } catch {
    return dedupeByMarket(seed)
  }
}

// Server-side: enrich a list of calls with live Polymarket prices when the
// market has a slug. Issues one batched fetch (cached for 60s). Falls back
// to the original call list if anything goes wrong — never blocks rendering.
export async function loadCallsWithPolymarket(): Promise<PublishedCall[]> {
  const calls = loadCalls()
  if (typeof window !== 'undefined') return calls
  try {
    const [{ loadMarketsMeta }, { getPolymarketPrices }] = await Promise.all([
      import('./markets-data.js'),
      import('./polymarket.js'),
    ])
    const meta = loadMarketsMeta()
    const slugByMarketId = new Map<string, string>()
    for (const m of meta) if (m.polymarketSlug) slugByMarketId.set(m.id, m.polymarketSlug)
    const slugs = Array.from(new Set(calls.map((c) => slugByMarketId.get(c.marketId)).filter((s): s is string => !!s)))
    if (slugs.length === 0) return calls
    const prices = await getPolymarketPrices(slugs)
    return calls.map((c) => {
      const slug = slugByMarketId.get(c.marketId)
      if (!slug) return c
      const p = prices.get(slug)
      if (!p) return c
      return { ...c, livePolymarket: { yes: p.yes, slug, question: p.question } }
    })
  } catch {
    return calls
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

// Server-side: same as getCallById but attaches the live Polymarket line when
// the market has a slug — so the detail page references the SAME real-world
// price the feed card shows (no 50%-vs-7% contradiction). Falls back cleanly.
export async function getCallByIdWithPolymarket(id: string): Promise<PublishedCall | undefined> {
  const call = getCallById(id)
  if (!call || typeof window !== 'undefined') return call
  try {
    const [{ loadMarketsMeta }, { getPolymarketPrices }] = await Promise.all([
      import('./markets-data.js'),
      import('./polymarket.js'),
    ])
    const meta = loadMarketsMeta()
    const slug = meta.find((m) => m.id === call.marketId)?.polymarketSlug
    if (!slug) return call
    const prices = await getPolymarketPrices([slug])
    const p = prices.get(slug)
    if (!p) return call
    return { ...call, livePolymarket: { yes: p.yes, slug, question: p.question } }
  } catch {
    return call
  }
}

export function relativeTime(ms: number): string {
  const delta = Date.now() - ms
  const hr = Math.floor(delta / 3600000)
  if (hr < 1) return 'just now'
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}
