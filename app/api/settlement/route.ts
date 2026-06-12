// GET /api/settlement?slug=<polymarket-slug>
//
// The settlement oracle, exposed for verification. Reads a Polymarket market's
// UMA Optimistic Oracle resolution and maps it to YES / NO / PENDING. This is
// the authoritative source CROSSFIRE settles live markets against — decentralized,
// disputable, on-chain. No invented outcomes.

import type { NextRequest } from 'next/server'
import { getPolymarketResolution } from '../../../lib/polymarket.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return Response.json({ error: 'pass ?slug=<polymarket-slug>' }, { status: 400 })

  const r = await getPolymarketResolution(slug)
  if (!r) {
    return Response.json({ slug, status: 'PENDING', via: 'unknown', note: 'market not found or oracle unreachable' })
  }

  return Response.json({
    slug: r.slug,
    status: r.status,                       // YES | NO | PENDING
    via: r.status === 'PENDING' ? 'pending' : 'uma',
    umaStatus: r.umaStatus,                 // e.g. "resolved"
    resolvedBy: r.resolvedBy,               // on-chain UMA resolver contract — the proof
    question: r.question,
    oracle: 'UMA Optimistic Oracle via Polymarket',
  })
}
