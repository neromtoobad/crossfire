// POST /api/mandate — receives a signed delegation from the client, stores it
// keyed to the user's wallet address + market id. The server-side orchestrator
// will redelegate against this when /api/duel/run fires.

import { NextResponse, type NextRequest } from 'next/server'
import { getMarketMeta } from '../../../lib/markets-data.js'
import { upsertMandate, type StoredMandate } from '../../../lib/mandate-store.js'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 }) }

  const required = ['user', 'marketId', 'capUsdc', 'expiresAt', 'signedDelegation', 'delegationManager', 'chainId']
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) {
      return NextResponse.json({ ok: false, error: `missing field: ${k}` }, { status: 400 })
    }
  }

  const marketMeta = getMarketMeta(body.marketId)
  if (!marketMeta) {
    return NextResponse.json({ ok: false, error: `unknown marketId: ${body.marketId}` }, { status: 400 })
  }

  // Basic shape check on the signed delegation
  const sd = body.signedDelegation
  if (!sd?.delegate || !sd?.delegator || !sd?.signature) {
    return NextResponse.json({ ok: false, error: 'signedDelegation missing required fields' }, { status: 400 })
  }

  const mandate: StoredMandate = {
    user: body.user,
    marketId: body.marketId,
    marketAddress: marketMeta.address,
    capUsdc: Number(body.capUsdc),
    capWei: String(body.capWei ?? Math.floor(Number(body.capUsdc) * 1e6)),
    expiresAt: Number(body.expiresAt),
    signedDelegation: sd,
    delegationManager: body.delegationManager,
    chainId: Number(body.chainId),
    signedAt: Date.now(),
  }

  upsertMandate(mandate)
  return NextResponse.json({ ok: true, mandate: { ...mandate, signedDelegation: '[omitted]' } })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const user = url.searchParams.get('user')
  const marketId = url.searchParams.get('marketId')
  if (!user || !marketId) {
    return NextResponse.json({ ok: false, error: 'user + marketId query params required' }, { status: 400 })
  }
  const { getActiveMandate } = await import('../../../lib/mandate-store.js')
  const m = getActiveMandate(user, marketId)
  return NextResponse.json({ ok: true, active: m ?? null })
}
