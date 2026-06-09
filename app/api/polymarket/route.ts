// GET /api/polymarket?slug=foo[,bar,baz]
//
// Server-side proxy + cache for Polymarket Gamma prices. Keeps the UI
// CORS-free, lets us cache aggressively, and centralizes the slug list
// so the client never has to know the Gamma URL.

import type { NextRequest } from 'next/server'
import { getPolymarketPrice } from '../../../lib/polymarket.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const slugParam = url.searchParams.get('slug') ?? ''
  const slugs = slugParam.split(',').map((s) => s.trim()).filter(Boolean)
  if (slugs.length === 0) {
    return Response.json({ error: 'slug required' }, { status: 400 })
  }
  const results = await Promise.all(slugs.map((s) => getPolymarketPrice(s)))
  const out: Record<string, ReturnType<typeof shape>> = {}
  slugs.forEach((slug, i) => {
    out[slug] = shape(results[i] ?? null)
  })
  return Response.json(out, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  })
}

function shape(p: Awaited<ReturnType<typeof getPolymarketPrice>>) {
  if (!p) return null
  return {
    yes: p.yes,
    no:  p.no,
    active: p.active,
    closed: p.closed,
    question: p.question,
    fetchedAt: p.fetchedAt,
  }
}
