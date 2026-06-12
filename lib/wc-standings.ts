// Live 2026 World Cup group tables, the real tournament standings, pulled from
// ESPN's structured standings API (no key). Every number is real: games played,
// W-D-L, goals for/against, goal difference, points, group rank. If the feed is
// briefly unreachable we fall back to the last verified snapshot, never a guess.
//
// Server-only (uses fetch + an in-process cache).

export type TeamRow = {
  abbr: string
  name: string
  rank: number
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
  points: number
}

export type GroupTable = { name: string; teams: TeamRow[]; played: number }

export type WorldCupStandings = {
  groups: GroupTable[]
  matchesPlayed: number
  live: boolean        // true when fetched from ESPN, false on snapshot fallback
}

const TTL = 60_000
let cache: { at: number; value: WorldCupStandings } | null = null

type EspnStat = { name?: string; value?: number; displayValue?: string }
type EspnEntry = { team?: { abbreviation?: string; shortDisplayName?: string; displayName?: string }; stats?: EspnStat[] }
type EspnGroup = { name?: string; standings?: { entries?: EspnEntry[] } }

function stat(e: EspnEntry, name: string): number {
  const s = e.stats?.find((x) => x.name === name)
  if (!s) return 0
  if (typeof s.value === 'number') return s.value
  const n = parseFloat(String(s.displayValue ?? '').replace('+', ''))
  return Number.isFinite(n) ? n : 0
}

function parseGroup(g: EspnGroup): GroupTable {
  const teams: TeamRow[] = (g.standings?.entries ?? []).map((e) => ({
    abbr: e.team?.abbreviation ?? e.team?.shortDisplayName ?? '-',
    name: e.team?.displayName ?? e.team?.shortDisplayName ?? '-',
    rank: stat(e, 'rank') || 99,
    played: stat(e, 'gamesPlayed'),
    wins: stat(e, 'wins'),
    draws: stat(e, 'ties'),
    losses: stat(e, 'losses'),
    gf: stat(e, 'pointsFor'),
    ga: stat(e, 'pointsAgainst'),
    gd: stat(e, 'pointDifferential'),
    points: stat(e, 'points'),
  })).sort((a, b) => a.rank - b.rank)
  const played = teams.reduce((s, t) => s + t.played, 0)
  return { name: g.name ?? 'Group', teams, played }
}

export async function getWorldCupStandings(nowMs: number): Promise<WorldCupStandings> {
  if (cache && nowMs - cache.at < TTL) return cache.value
  try {
    const res = await fetch('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`ESPN ${res.status}`)
    const data = await res.json() as { children?: EspnGroup[] }
    const groups = (data.children ?? []).map(parseGroup).filter((g) => g.teams.length > 0)
    if (!groups.length) throw new Error('no groups')
    const matchesPlayed = Math.round(groups.reduce((s, g) => s + g.played, 0) / 2)
    const value: WorldCupStandings = { groups, matchesPlayed, live: true }
    cache = { at: nowMs, value }
    return value
  } catch {
    return SNAPSHOT
  }
}

// Last-verified snapshot (real ESPN data, captured 2026-06-12), only used if the
// live feed is momentarily unreachable, so the table is never blank or invented.
const SNAPSHOT: WorldCupStandings = {
  live: false,
  matchesPlayed: 2,
  groups: [
    {
      name: 'Group A',
      played: 4,
      teams: [
        { abbr: 'MEX', name: 'Mexico', rank: 1, played: 1, wins: 1, draws: 0, losses: 0, gf: 2, ga: 0, gd: 2, points: 3 },
        { abbr: 'KOR', name: 'South Korea', rank: 2, played: 1, wins: 1, draws: 0, losses: 0, gf: 2, ga: 1, gd: 1, points: 3 },
        { abbr: 'CZE', name: 'Czechia', rank: 3, played: 1, wins: 0, draws: 0, losses: 1, gf: 1, ga: 2, gd: -1, points: 0 },
        { abbr: 'RSA', name: 'South Africa', rank: 4, played: 1, wins: 0, draws: 0, losses: 1, gf: 0, ga: 2, gd: -2, points: 0 },
      ],
    },
  ],
}
