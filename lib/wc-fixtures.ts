// World Cup 2026 group stage — the full fixture list, as match calls.
//
// 12 groups × 4 teams = 72 round-robin fixtures. Rather than hand-author every
// one, we generate them deterministically: a seeded PRNG picks the favourite by
// team strength, the five pundits vote in-character (varied one-liners, dissent
// scaled by how close the match is), and the pot follows. Deterministic = SSR-
// safe (no Date.now / Math.random at runtime).

import type { PublishedCall, AgentVote, AgentRole } from './calls-data.js'

// Fixed reference time so SSR is stable (matches calls-data NOW).
const NOW = 1780_700_000_000

// ── seeded PRNG (mulberry32) ──────────────────────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// ── 48 teams, strength 0-100, in their 12 groups ──────────────────────────
const GROUPS: Record<string, [string, number][]> = {
  A: [['Mexico', 80], ['Croatia', 83], ['Ecuador', 76], ['Norway', 78]],
  B: [['Canada', 76], ['Belgium', 84], ['Morocco', 83], ['Saudi Arabia', 68]],
  C: [['USA', 80], ['Uruguay', 83], ['Japan', 80], ['Egypt', 74]],
  D: [['Germany', 88], ['Senegal', 79], ['Poland', 76], ['Iran', 71]],
  E: [['Spain', 91], ['Switzerland', 80], ['Nigeria', 78], ['Panama', 66]],
  F: [['Argentina', 92], ['Denmark', 79], ['Ivory Coast', 76], ['New Zealand', 63]],
  G: [['France', 91], ['Colombia', 82], ['South Korea', 78], ['Qatar', 67]],
  H: [['Brazil', 89], ['Netherlands', 86], ['Australia', 74], ['Tunisia', 72]],
  I: [['England', 88], ['Serbia', 79], ['Cameroon', 75], ['Costa Rica', 69]],
  J: [['Portugal', 87], ['Mexico II', 0], ['Ghana', 75], ['Jamaica', 67]], // placeholder swapped below
  K: [['Italy', 84], ['Ukraine', 78], ['Algeria', 74], ['Peru', 71]],
  L: [['Netherlands II', 0], ['Austria', 77], ['Paraguay', 72], ['South Africa', 70]],
}
// fix the two placeholders with real distinct teams
GROUPS.J[1] = ['Turkey', 78]
GROUPS.L[0] = ['Sweden', 78]

// ── per-pundit one-liner templates (interpolate favourite F vs dog D) ──────
type Tmpl = (F: string, D: string) => string
const LINES: Record<AgentRole, Tmpl[]> = {
  MacroScout: [
    (F, D) => `${F} control this with the ball — they squeeze ${D}'s midfield and win the game they're meant to win.`,
    (F, D) => `Shape decides it: ${F}'s back line steps up and ${D} can't play through them.`,
    (F, D) => `${D} will sit deep, but ${F} have the patience and the overloads to break a low block.`,
    (F, D) => `A managed performance from ${F} — see out the early ${D} press, then take over.`,
  ],
  NewsHawk: [
    (F, D) => `${F} name a full-strength side; ${D} are missing a key man at the back. Edge ${F}.`,
    (F, D) => `Word from the camp: ${F} rotate but keep the spine, ${D} risk a fitness doubt up top.`,
    (F, D) => `${D} have a suspension in midfield — that's the gap ${F} exploit.`,
    (F, D) => `Both rest legs, but ${F}'s bench depth dwarfs ${D}'s — they finish stronger.`,
  ],
  CrowdPulse: [
    (F, D) => `${F} are flying and ${D} are nervy — momentum is one-way here.`,
    (F, D) => `Feel of the group says ${F}; ${D} look like a side playing not to lose.`,
    (F, D) => `${D} have belief on a good day, but ${F} carry the room when it tightens.`,
    (F, D) => `${F}'s crowd will travel and lift them — ${D} fold when it gets loud.`,
  ],
  BookWatcher: [
    (F, D) => `${F}'s xG profile dwarfs ${D}'s; the line under-rates the gap.`,
    (F, D) => `Shot volume and chance quality both favour ${F} — the numbers say comfortable.`,
    (F, D) => `${D} concede high-value chances; ${F} convert them. Edge to ${F} on the data.`,
    (F, D) => `Set-piece threat tilts ${F} too — that's the marginal goal in a tight one.`,
  ],
  Skeptic: [
    (F, D) => `${D}'s only path is a smash-and-grab on the counter — possible, but I'm with the panel.`,
    (F, D) => `Tournament openers are cagey and ${F} can be flat, but they've too much for ${D}.`,
    (F, D) => `Watch a ${D} set-piece, but one chance doesn't beat ${F} over 90.`,
    (F, D) => `If ${F} switch off it's a draw — narrowly, the panel's right to back them.`,
  ],
}
const ROLES: AgentRole[] = ['MacroScout', 'NewsHawk', 'CrowdPulse', 'BookWatcher', 'Skeptic']
const MKT_ADDR = '0xc2384369ad925fe5570e1b6311d84be21a7ac7a7' as const // shared display addr

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 6)

function makeFixtureCall(group: string, a: [string, number], b: [string, number], idx: number): PublishedCall {
  // favourite = stronger side; market framed "FAV to beat DOG?"
  const [fav, dog] = a[1] >= b[1] ? [a, b] : [b, a]
  const F = fav[0], D = dog[0]
  const gap = fav[1] - dog[1] // 0..~25
  const r = rng(hashStr(`${group}-${F}-${D}`))

  // panel leans to the favourite, strength of lean scales with the gap
  const favProb = Math.min(0.86, 0.5 + gap / 50 + (r() - 0.5) * 0.08) // ~0.5..0.86
  // dissent: closer matches get more NO votes (an upset-caller)
  const dissenters = gap < 6 ? 2 : gap < 12 ? 1 : (r() < 0.3 ? 1 : 0)

  const votes: AgentVote[] = ROLES.map((role, i) => {
    const tmpls = LINES[role]
    const line = tmpls[Math.floor(r() * tmpls.length)]
    // the last `dissenters` of the 4 outfield pundits back the dog (NO)
    const isOutfield = role !== 'Skeptic'
    const dissent = isOutfield && i >= 4 - dissenters
    if (role === 'Skeptic') {
      // THE PUNDIT is a genuine contrarian — he fades the favourite ~45% of the
      // time (and pays for it on the chalk that holds). That's why he ends up
      // miscalibrated and on the smallest budget — the accountability loop biting.
      if (r() < 0.45) {
        return { role, vote: 'NO', confidence: Math.round((0.55 + r() * 0.15) * 100) / 100,
          oneLiner: `Everyone's piled on ${F} — that's exactly when they bottle it. I'll take ${D}.` }
      }
      return { role, vote: 'YES', confidence: Math.round((0.18 + r() * 0.18) * 100) / 100, oneLiner: line(F, D) }
    }
    if (dissent) {
      // an upset shout for the dog
      return { role, vote: 'NO', confidence: Math.round((0.52 + r() * 0.12) * 100) / 100, oneLiner: `${D} are live here — ${F} are beatable if they start slow.` }
    }
    return { role, vote: 'YES', confidence: Math.round((favProb - 0.05 + r() * 0.12) * 100) / 100, oneLiner: line(F, D) }
  })

  const selectedSideProb = Math.round(favProb * 100) / 100
  const marketImpliedYes = Math.round((favProb - 0.06 - r() * 0.05) * 100) / 100
  const bond = Math.round((2 + gap / 6) * 100) / 100

  return {
    id: `call-wc-grp-${group.toLowerCase()}-${slug(F)}-${slug(D)}`,
    marketId: `wc-group-${group.toLowerCase()}-${slug(F)}-${slug(D)}`,
    marketTitle: `${F} to beat ${D}? (Group ${group})`,
    marketAddress: MKT_ADDR,
    side: 'YES',
    selectedSideProb,
    marketImpliedYes,
    edge: Math.round((selectedSideProb - marketImpliedYes) * 100) / 100,
    bondUsdc: bond,
    unlockUsdc: 0.1,
    publishedAt: NOW - (24 + idx) * 3600 * 1000, // older than the marquee calls
    publishedBy: 'The Panel',
    votes,
    skepticVerdict: 'APPROVED',
    locked: {
      thesis: `Group ${group} fixture. The panel backs ${F} to beat ${D} at ${Math.round(selectedSideProb * 100)}% against a ${Math.round(marketImpliedYes * 100)}% line. The case rests on the talent and control gap; the live risk is a slow ${F} start letting ${D} settle.`,
      evidenceUrls: [
        { label: `${F} vs ${D} — form + xG`, url: 'https://fbref.com', signal: 'YES' },
        { label: 'Group team-news watch', url: 'https://www.fifa.com', signal: 'YES' },
      ],
      sizingRationale: `Bond ${bond} USDC — scaled to the strength gap between ${F} and ${D}.`,
      counterarguments: `${D}'s path is an early goal on the counter and a low block thereafter; the panel rates that the minority case.`,
    },
  }
}

// Resolutions for the fixtures that have already been played (matchdays 1-2 of
// 3). Favourites win more often than not, scaled by the strength gap, with
// genuine upsets — so the agents who back chalk score well, the contrarian and
// the dissenters have mixed records, and the standings have real depth. The
// last third of fixtures stay PENDING (live matches still to come).
export const FIXTURE_RESOLUTIONS: Record<string, 'YES' | 'NO'> = {}
const RESOLVED_THROUGH = 48 // of 72 — leaves 24 live

export const FIXTURE_CALLS: PublishedCall[] = (() => {
  const out: PublishedCall[] = []
  let idx = 0
  for (const [group, teams] of Object.entries(GROUPS)) {
    // round-robin: 6 matches per group of 4
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const call = makeFixtureCall(group, teams[i], teams[j], idx)
        out.push(call)
        if (idx < RESOLVED_THROUGH) {
          const [fa, fb] = teams[i][1] >= teams[j][1] ? [teams[i], teams[j]] : [teams[j], teams[i]]
          const gap = fa[1] - fb[1]
          const favWinP = Math.min(0.85, 0.58 + gap / 60)
          const draw = rng(hashStr(`res-${call.marketId}`))()
          FIXTURE_RESOLUTIONS[call.marketId] = draw < favWinP ? 'YES' : 'NO'
        }
        idx++
      }
    }
  }
  return out
})()
