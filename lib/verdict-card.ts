// Venice verdict card — the visible Venice IMAGE output for a call.
// Venice generates the broadcast artwork (gold trophy / stadium); the UI
// overlays the crisp YES/NO verdict text on top (model text rendering is
// unreliable, so we keep the data legible ourselves). Cached to runtime state
// so a card is generated once per call and shown instantly thereafter.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { env } from './env.js'

const DIR = resolve(process.cwd(), '.crossfire/verdict-cards')
const IMAGE_MODEL = 'venice-sd35' // fast, reliable Venice image model

function cachePath(callId: string): string {
  return resolve(DIR, `${callId.replace(/[^a-z0-9-]/gi, '_')}.txt`)
}

export function getCachedCard(callId: string): string | null {
  try {
    return readFileSync(cachePath(callId), 'utf8')
  } catch {
    return null
  }
}

/** Generate (or return cached) a Venice verdict-card image as a data URL. */
export async function generateVerdictCard(callId: string, side: 'YES' | 'NO'): Promise<string> {
  const cached = getCachedCard(callId)
  if (cached) return cached

  const key = env.VENICE_API_KEY
  if (!key) throw new Error('VENICE_API_KEY missing — Venice is the only engine.')

  const mood = side === 'YES'
    ? 'triumphant golden glow, rising light, victory energy'
    : 'cool moody contrast, dramatic shadow, tension'
  const prompt = [
    'Premium broadcast sports-prediction key art, FIFA World Cup 2026.',
    'Deep navy-black background with gold and amber accents,',
    'a golden World Cup trophy as the hero element, cinematic stadium lighting,',
    `subtle gold particles and bokeh, ${mood},`,
    'luxury editorial poster aesthetic, high contrast, ultra clean,',
    'no text, no letters, no words, no typography.',
  ].join(' ')

  const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IMAGE_MODEL, prompt,
      width: 1024, height: 768, format: 'webp',
      safe_mode: false, return_binary: false,
    }),
  })
  if (!res.ok) throw new Error(`Venice image endpoint ${res.status}`)
  const data = (await res.json()) as { images?: string[] }
  const b64 = data.images?.[0]
  if (!b64) throw new Error('Venice returned no image')

  const dataUrl = `data:image/webp;base64,${b64}`
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })
  writeFileSync(cachePath(callId), dataUrl)
  return dataUrl
}
