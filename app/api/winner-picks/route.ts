// GET  → the agents' cached World Cup winner picks (or { picks: [] })
// POST → generate them live via Venice, cache, return

import { getCachedWinnerPicks, generateWinnerPicks } from '../../../lib/winner-picks.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const data = getCachedWinnerPicks()
  return Response.json(data ?? { picks: [], debate: [] })
}

export async function POST() {
  try {
    const data = await generateWinnerPicks()
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
