// POST { handle, text }  → audio/mpeg of that oracle speaking, in its own
// Venice voice. Generated once via Venice tts-kokoro, then cached + replayed.
// Each oracle has a distinct voice (see lib/pundits.ts voiceId).

import type { NextRequest } from 'next/server'
import { generateVoice } from '../../../lib/voice.js'
import { PUNDITS } from '../../../lib/pundits.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VOICE_BY_HANDLE: Record<string, string> = Object.fromEntries(
  Object.values(PUNDITS).map((p) => [p.handle.toUpperCase(), p.voiceId]),
)

export async function POST(req: NextRequest) {
  let body: { handle?: string; voiceId?: string; text?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  const text = (body.text || '').trim()
  if (!text) return Response.json({ error: 'no text' }, { status: 400 })

  const voiceId = body.voiceId || VOICE_BY_HANDLE[(body.handle || '').toUpperCase()]
  if (!voiceId) return Response.json({ error: 'unknown voice' }, { status: 400 })

  try {
    const { audio } = await generateVoice(voiceId, text)
    return new Response(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
