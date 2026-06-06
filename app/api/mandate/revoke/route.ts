// POST /api/mandate/revoke — marks a user's mandate as soft-revoked in
// our store after they've called DelegationManager.disableDelegation
// on-chain. The on-chain refusal is the cryptographic truth; this is
// just the server's bookkeeping so /api/duel/run won't try a redemption
// it knows will revert.

import { NextResponse, type NextRequest } from 'next/server'
import { revokeMandate } from '../../../../lib/mandate-store.js'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 }) }

  const user = body?.user
  const marketId = body?.marketId
  if (!user || !marketId) {
    return NextResponse.json({ ok: false, error: 'user + marketId required' }, { status: 400 })
  }

  const ok = revokeMandate(String(user), String(marketId))
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'no active mandate to revoke' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
