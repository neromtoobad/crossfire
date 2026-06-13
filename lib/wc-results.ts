// Live 2026 World Cup results, the real, self-updating source for "matches
// played". We pull final scores from ESPN's structured scoreboard API (no key),
// not from anything hand-typed. Only matches that are actually FULL-TIME are
// shown; the agents are graded against the real score. If the feed is briefly
// unreachable we fall back to the last verified snapshot, never a guess.

import type { AgentRole, AgentVote, PublishedCall } from './calls-data.js'

export type SettledCall = { role: AgentRole; vote: 'YES' | 'NO'; confidence: number }

export type SettledMatch = {
  id: string
  home: string; homeFlag: string  // home = framed favourite (display order)
  away: string; awayFlag: string
  score: string                   // REAL final score, favourite–underdog
  stage: string
  market: string
  favorite: string
  outcome: 'YES' | 'NO'           // did the favourite win
  story: string
  source: string
  calls: SettledCall[]
}

export function hits(m: SettledMatch): number {
  return m.calls.filter((c) => c.vote === m.outcome).length
}

// Public, approximate FIFA strength (lower = stronger), used ONLY to frame
// which side the agents lean pre-match, independent of the result.
const RANK: Record<string, number> = {
  Argentina: 1, France: 2, Spain: 3, England: 4, Brazil: 5, Portugal: 6, Netherlands: 7,
  Belgium: 8, Italy: 9, Germany: 10, Croatia: 11, Morocco: 12, Mexico: 13, Colombia: 14,
  'United States': 15, Uruguay: 16, Switzerland: 17, Japan: 18, Senegal: 19, 'South Korea': 23,
  Denmark: 21, Iran: 22, Australia: 24, Ukraine: 25, Austria: 26, Ecuador: 27, Canada: 30,
  Panama: 31, Egypt: 33, 'Ivory Coast': 34, Nigeria: 35, Norway: 36, Hungary: 37, Poland: 38,
  Paraguay: 40, Czechia: 41, Tunisia: 42, 'Costa Rica': 45, 'Saudi Arabia': 55, Qatar: 50,
  'South Africa': 60, 'Bosnia-Herzegovina': 70, 'Cape Verde': 72, Jordan: 65, Uzbekistan: 57,
  'New Zealand': 80, Haiti: 85, Curaçao: 88, Türkiye: 26, Turkey: 26, Scotland: 44, Algeria: 43,
  Iraq: 58, 'Congo DR': 56, 'DR Congo': 56, Serbia: 33, Cameroon: 52, Peru: 48, Ghana: 53,
  Jamaica: 64, Sweden: 38, Ukraine: 28, Panama: 41,
}
const FLAG: Record<string, string> = {
  Argentina: '🇦🇷', France: '🇫🇷', Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Brazil: '🇧🇷', Portugal: '🇵🇹',
  Netherlands: '🇳🇱', Belgium: '🇧🇪', Italy: '🇮🇹', Germany: '🇩🇪', Croatia: '🇭🇷', Morocco: '🇲🇦',
  Mexico: '🇲🇽', Colombia: '🇨🇴', 'United States': '🇺🇸', Uruguay: '🇺🇾', Switzerland: '🇨🇭', Japan: '🇯🇵',
  Senegal: '🇸🇳', 'South Korea': '🇰🇷', Denmark: '🇩🇰', Iran: '🇮🇷', Australia: '🇦🇺', Ukraine: '🇺🇦',
  Austria: '🇦🇹', Ecuador: '🇪🇨', Canada: '🇨🇦', Panama: '🇵🇦', Egypt: '🇪🇬', 'Ivory Coast': '🇨🇮',
  Nigeria: '🇳🇬', Norway: '🇳🇴', Hungary: '🇭🇺', Poland: '🇵🇱', Paraguay: '🇵🇾', Czechia: '🇨🇿',
  Tunisia: '🇹🇳', 'Costa Rica': '🇨🇷', 'Saudi Arabia': '🇸🇦', Qatar: '🇶🇦', 'South Africa': '🇿🇦',
  'Bosnia-Herzegovina': '🇧🇦', 'Cape Verde': '🇨🇻', Jordan: '🇯🇴', Uzbekistan: '🇺🇿', 'New Zealand': '🇳🇿',
  Haiti: '🇭🇹', Curaçao: '🇨🇼',
}
const rankOf = (t: string) => RANK[t] ?? 50
const flagOf = (t: string) => FLAG[t] ?? '🏳️'

const ROLES: AgentRole[] = ['MacroScout', 'NewsHawk', 'CrowdPulse', 'BookWatcher', 'Skeptic']

// Build the agents' pre-match calls for a real fixture: the four lane agents
// back the stronger side (YES), the contrarian VEGA fades it (NO). Confidence
// scales with the strength gap. Deterministic, no result peeking.
// Deterministic ~50/50 from a string (FNV-1a, low bit). Stable per match.
function seedFlip(seed: string): boolean {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) & 1) === 0
}

function callsFor(favProb: number, idx = 0): SettledCall[] {
  return ROLES.map((role, i) => {
    // VEGA, the contrarian, always fades the favourite.
    if (role === 'Skeptic') return { role, vote: 'NO', confidence: 0.55 + (i % 2) * 0.02 }
    // NEXUS, the momentum model, is the WILDCARD: it zigzags match to match
    // (rides whoever has the momentum), so it backs the favourite on some and
    // fades on others, landing ~50% over time. Never a clone of the pack, never
    // a permanent fader like VEGA.
    if (role === 'CrowdPulse') {
      return { role, vote: idx % 2 === 0 ? 'YES' : 'NO', confidence: Math.round((0.5 + (i % 2) * 0.03) * 100) / 100 }
    }
    return { role, vote: 'YES', confidence: Math.round((favProb - 0.04 + i * 0.02) * 100) / 100 }
  })
}

type EspnTeam = { team?: { displayName?: string }; homeAway?: string; score?: string }
type EspnEvent = {
  id?: string
  date?: string
  competitions?: { competitors?: EspnTeam[]; status?: { type?: { completed?: boolean; shortDetail?: string } } }[]
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

let cache: { at: number; value: SettledMatch[] } | null = null
const TTL = 10 * 60_000

// ── the live feed ───────────────────────────────────────────────────────────
export async function getPlayedMatches(nowMs: number, maxMatches = 4): Promise<SettledMatch[]> {
  if (cache && nowMs - cache.at < TTL) return cache.value

  const days: string[] = []
  for (let i = 0; i < 3; i++) days.push(ymd(new Date(nowMs - i * 86400_000)))

  const out: SettledMatch[] = []
  try {
    const pages = await Promise.all(days.map((d) =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ))

    for (let di = 0; di < pages.length; di++) {
      const evs = (pages[di]?.events ?? []) as EspnEvent[]
      for (const e of evs) {
        const comp = e.competitions?.[0]
        if (!comp?.status?.type?.completed) continue // FULL-TIME only
        const cs = comp.competitors ?? []
        const a = cs[0], b = cs[1]
        const an = a?.team?.displayName, bn = b?.team?.displayName
        if (!an || !bn) continue
        const as = Number(a?.score ?? 0), bs = Number(b?.score ?? 0)

        // frame around the stronger side
        const [fav, favScore, dog, dogScore] = rankOf(an) <= rankOf(bn) ? [an, as, bn, bs] : [bn, bs, an, as]
        const favProb = Math.min(0.85, Math.max(0.52, 0.5 + (rankOf(dog) - rankOf(fav)) * 0.006))
        const outcome: 'YES' | 'NO' = favScore > dogScore ? 'YES' : 'NO'
        const story = outcome === 'YES'
          ? `The favourite delivered, ${fav} saw off ${dog}.`
          : favScore === dogScore
            ? `Held to a draw, ${fav} couldn't break ${dog} down.`
            : `The upset landed, ${dog} stunned ${fav}.`

        out.push({
          id: e.id ?? `${fav}-${dog}-${days[di]}`,
          home: fav, homeFlag: flagOf(fav),
          away: dog, awayFlag: flagOf(dog),
          score: `${favScore}–${dogScore}`,
          stage: `2026 World Cup · ${formatDay(e.date)}`,
          market: `${fav} to beat ${dog}`,
          favorite: fav,
          outcome,
          story,
          source: 'ESPN · live feed',
          calls: callsFor(favProb, out.length),
        })
      }
    }
  } catch { /* fall through to snapshot */ }

  const result = out.length ? out.slice(0, maxMatches) : SNAPSHOT
  cache = { at: nowMs, value: result }
  return result
}

function formatDay(iso?: string): string {
  if (!iso) return 'Group stage'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 'Group stage'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}`
}

// ── War Room markets: REAL upcoming + recent fixtures (debate topics) ───────
// Pulled live from ESPN so the room debates actual World Cup matches, not a
// fictional group draw. Each is a PublishedCall so Fade/Follow works.

const MKT_ADDR = '0xc2384369ad925fe5570e1b6311d84be21a7ac7a7' as const
const NOW = 1780_700_000_000

function oneLiner(role: AgentRole, fav: string, dog: string): string {
  switch (role) {
    case 'MacroScout': return `${fav} control the shape, they dictate tempo and make ${dog} chase the game.`
    case 'NewsHawk': return `${fav} go in the fitter, fuller side; ${dog}'s team-news is the worry, not theirs.`
    case 'CrowdPulse': return `${fav} carry the belief and the momentum here, ${dog} tend to fold when it tightens.`
    case 'BookWatcher': return `The numbers favour ${fav}: better xG profile and chance quality than ${dog}.`
    default: return `Everyone's on ${fav}. That's exactly when they slip, I'll take ${dog} to make it awkward.`
  }
}

function makeMarketCall(fav: string, dog: string, favProb: number, dayLabel: string, id: string): PublishedCall {
  const votes: AgentVote[] = ROLES.map((role) => {
    // VEGA, the contrarian, fades the favourite.
    if (role === 'Skeptic') return { role, vote: 'NO' as const, confidence: 0.56, oneLiner: oneLiner(role, fav, dog) }
    // NEXUS, the momentum model, is the WILDCARD: an unpredictable per-match
    // coin flip (it rides whoever has the momentum), landing ~50% over time.
    if (role === 'CrowdPulse') {
      const yes = seedFlip(`${fav}-${dog}|nexus`)
      return { role, vote: yes ? 'YES' as const : 'NO' as const, confidence: 0.55,
        oneLiner: yes
          ? `${fav} have the momentum and the belief, ${dog} tend to fold when it tightens.`
          : `The momentum's swung to ${dog}, ${fav} look there for the taking.` }
    }
    return { role, vote: 'YES' as const, confidence: Math.min(0.9, Math.max(0.5, Math.round((favProb - 0.04) * 100) / 100)), oneLiner: oneLiner(role, fav, dog) }
  })
  const bond = Math.round((2 + favProb * 4) * 100) / 100
  const implied = Math.round((favProb - 0.05) * 100) / 100
  return {
    id, marketId: id, marketTitle: `${fav} to beat ${dog}? · ${dayLabel}`, marketAddress: MKT_ADDR,
    side: 'YES', selectedSideProb: Math.round(favProb * 100) / 100, marketImpliedYes: implied,
    edge: Math.round((favProb - implied) * 100) / 100, bondUsdc: bond, unlockUsdc: 0.1,
    publishedAt: NOW, publishedBy: 'The Panel', votes, skepticVerdict: 'APPROVED',
    locked: {
      thesis: `${fav} vs ${dog}, 2026 World Cup. The panel backs ${fav} at ${Math.round(favProb * 100)}% against a ${Math.round(implied * 100)}% line, control, quality and squad depth. A live market; it settles via UMA's Optimistic Oracle on the real result.`,
      evidenceUrls: [{ label: `${fav} vs ${dog} preview`, url: 'https://www.espn.com/soccer/', signal: 'YES' }],
      sizingRationale: `Bond ${bond} USDC, scaled to the edge over the line.`,
      counterarguments: `${dog}'s upset path: a fast start that forces ${fav} to chase the game late.`,
    },
  }
}

let mktCache: { at: number; value: PublishedCall[] } | null = null

// Real World Cup fixtures (upcoming first, then recent) as debate markets.
export async function getWorldCupMarkets(nowMs: number, maxN = 30): Promise<PublishedCall[]> {
  if (mktCache && nowMs - mktCache.at < TTL) return mktCache.value
  const days: { ymd: string; offset: number }[] = []
  for (let i = -1; i <= 6; i++) days.push({ ymd: ymd(new Date(nowMs + i * 86400_000)), offset: i })

  const upcoming: PublishedCall[] = []
  const recent: PublishedCall[] = []
  try {
    const pages = await Promise.all(days.map((d) =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d.ymd}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null)))

    for (let di = 0; di < pages.length; di++) {
      const evs = (pages[di]?.events ?? []) as EspnEvent[]
      for (const e of evs) {
        const comp = e.competitions?.[0]
        const cs = comp?.competitors ?? []
        const an = cs[0]?.team?.displayName, bn = cs[1]?.team?.displayName
        if (!an || !bn) continue
        const [fav, dog] = rankOf(an) <= rankOf(bn) ? [an, bn] : [bn, an]
        const favProb = Math.min(0.85, Math.max(0.52, 0.5 + (rankOf(dog) - rankOf(fav)) * 0.006))
        const call = makeMarketCall(fav, dog, favProb, formatDay(e.date), `wc-${e.id ?? `${fav}-${dog}-${days[di].ymd}`}`)
        if (comp?.status?.type?.completed) recent.push(call); else upcoming.push(call)
      }
    }
  } catch { /* fall through */ }

  const value = [...upcoming, ...recent].slice(0, maxN)
  mktCache = { at: nowMs, value }
  return value
}

// Last-verified fallback (real ESPN results, used only if the feed is down).
const SNAPSHOT: SettledMatch[] = [
  {
    id: 'mex-rsa-2026', home: 'Mexico', homeFlag: '🇲🇽', away: 'South Africa', awayFlag: '🇿🇦',
    score: '2–0', stage: '2026 World Cup · Jun 11', market: 'Mexico to beat South Africa',
    favorite: 'Mexico', outcome: 'YES', story: 'The favourite delivered, Mexico saw off South Africa.',
    source: 'ESPN', calls: callsFor(0.78, 0),
  },
  {
    id: 'kor-cze-2026', home: 'South Korea', homeFlag: '🇰🇷', away: 'Czechia', awayFlag: '🇨🇿',
    score: '2–1', stage: '2026 World Cup · Jun 11', market: 'South Korea to beat Czechia',
    favorite: 'South Korea', outcome: 'YES', story: 'The favourite delivered, South Korea edged Czechia.',
    source: 'ESPN', calls: callsFor(0.6, 1),
  },
]
