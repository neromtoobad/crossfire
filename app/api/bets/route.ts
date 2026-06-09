// GET  /api/bets?user=0x…  → the user's backed calls
// POST /api/bets            → record a fade/follow bet (called after the grant)

import type { NextRequest } from 'next/server'
import { recordBet, listBetsForUser } from '../../../lib/bets-store.js'
import { getResolution } from '../../../lib/resolutions.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = new URL(req.url).searchParams.get('user')
  if (!user) return Response.json({ error: 'user required' }, { status: 400 })
  // enrich each bet with the call's resolution + whether the user's side won
  const bets = listBetsForUser(user).map((b) => {
    const resolution = getResolution(b.marketId) // 'YES' | 'NO' | 'PENDING'
    const outcome = resolution === 'PENDING' ? 'pending' : b.side === resolution ? 'won' : 'lost'
    return { ...b, resolution, outcome }
  })
  return Response.json({ bets })
}

export async function POST(req: NextRequest) {
  let b: Partial<Record<string, unknown>>
  try { b = await req.json() } catch { return Response.json({ error: 'invalid JSON' }, { status: 400 }) }
  if (!b?.user || !b?.callId) return Response.json({ error: 'user + callId required' }, { status: 400 })
  recordBet({
    user: String(b.user),
    callId: String(b.callId),
    marketId: String(b.marketId ?? ''),
    marketTitle: String(b.marketTitle ?? ''),
    agentHandle: String(b.agentHandle ?? ''),
    choice: b.choice === 'fade' ? 'fade' : 'follow',
    side: b.side === 'NO' ? 'NO' : 'YES',
    amountUsdc: Number(b.amountUsdc) || 0,
    ts: Date.now(),
  })
  return Response.json({ ok: true })
}
