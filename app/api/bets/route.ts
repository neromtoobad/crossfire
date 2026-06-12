// GET  /api/bets?user=0x…  → the user's backed calls (durable, cross-device)
// POST /api/bets            → record a fade/follow bet (called after the grant)
//
// Backed by an OPTIONAL KV (see lib/kv.ts). When no KV is configured this is a
// graceful no-op and the Vault reads the client localStorage store instead — so
// the feature works with zero setup, and provisioning a KV upgrades it to
// cross-device sync without a code change.

import type { NextRequest } from 'next/server'
import { kvEnabled, kvGetJSON, kvSetJSON } from '../../../lib/kv.js'
import { getResolution } from '../../../lib/resolutions.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Proof = {
  context?: string; delegationManager?: string; capUsdc?: number
  expiry?: number; redeemer?: string; chainId?: number
}
type Bet = {
  user: string; callId: string; marketId: string; marketTitle: string; agentHandle: string
  choice: 'follow' | 'fade'; side: 'YES' | 'NO'; amountUsdc: number; ts: number; proof?: Proof
}

const keyFor = (user: string) => `cf:bets:${user.toLowerCase()}`

export async function GET(req: NextRequest) {
  const user = new URL(req.url).searchParams.get('user')
  if (!user) return Response.json({ error: 'user required' }, { status: 400 })
  const bets = await kvGetJSON<Bet[]>(keyFor(user), [])
  // enrich each bet with the call's resolution + whether the user's side won
  const enriched = bets
    .sort((a, b) => b.ts - a.ts)
    .map((b) => {
      const resolution = getResolution(b.marketId) // 'YES' | 'NO' | 'PENDING'
      const outcome = resolution === 'PENDING' ? 'pending' : b.side === resolution ? 'won' : 'lost'
      return { ...b, resolution, outcome }
    })
  return Response.json({ bets: enriched, kv: kvEnabled })
}

export async function POST(req: NextRequest) {
  let b: Partial<Record<string, unknown>>
  try { b = await req.json() } catch { return Response.json({ error: 'invalid JSON' }, { status: 400 }) }
  if (!b?.user || !b?.callId) return Response.json({ error: 'user + callId required' }, { status: 400 })
  // No KV → the client localStorage store is the source of truth; ack and move on.
  if (!kvEnabled) return Response.json({ ok: true, kv: false })

  const key = keyFor(String(b.user))
  const existing = await kvGetJSON<Bet[]>(key, [])
  const bet: Bet = {
    user: String(b.user).toLowerCase(),
    callId: String(b.callId),
    marketId: String(b.marketId ?? ''),
    marketTitle: String(b.marketTitle ?? ''),
    agentHandle: String(b.agentHandle ?? ''),
    choice: b.choice === 'fade' ? 'fade' : 'follow',
    side: b.side === 'NO' ? 'NO' : 'YES',
    amountUsdc: Number(b.amountUsdc) || 0,
    ts: Date.now(),
    proof: (b.proof && typeof b.proof === 'object') ? (b.proof as Proof) : undefined,
  }
  // one bet per user+call; re-backing updates it
  const kept = existing.filter((x) => x.callId !== bet.callId)
  kept.push(bet)
  await kvSetJSON(key, kept.slice(-200))
  return Response.json({ ok: true, kv: true })
}
