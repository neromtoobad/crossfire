// GET  → cached Venice verdict card for a call (or { cached:false })
// POST → generate one via Venice's image endpoint, cache it, return the data URL

import type { NextRequest } from 'next/server'
import { getCachedCard, generateVerdictCard } from '../../../../lib/verdict-card.js'
import { getCallById } from '../../../../lib/calls-data.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ callId: string }> }) {
  const { callId } = await ctx.params
  const dataUrl = getCachedCard(callId)
  return Response.json(dataUrl ? { cached: true, dataUrl } : { cached: false })
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ callId: string }> }) {
  const { callId } = await ctx.params
  const call = getCallById(callId)
  if (!call) return Response.json({ error: 'unknown call' }, { status: 404 })
  try {
    const dataUrl = await generateVerdictCard(callId, call.side)
    return Response.json({ cached: true, dataUrl })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
