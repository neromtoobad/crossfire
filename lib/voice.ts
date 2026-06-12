// Venice voice, each oracle speaks its own line in its own voice (Venice
// audio/speech, tts-kokoro). Cached to runtime state so a line is generated
// once and replays instantly.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'
import { env } from './env.js'

const DIR = resolve(STATE_BASE, 'voice')
const MODEL = 'tts-kokoro'

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(36)
}
function pathFor(key: string): string { return resolve(DIR, `${key}.mp3`) }

export function getCachedVoice(key: string): Buffer | null {
  try { return readFileSync(pathFor(key)) } catch { return null }
}

export async function generateVoice(voiceId: string, text: string): Promise<{ key: string; audio: Buffer }> {
  const clean = text.replace(/[“”"]/g, '').slice(0, 600)
  const key = hash(`${voiceId}|${clean}`)
  const cached = getCachedVoice(key)
  if (cached) return { key, audio: cached }

  const apiKey = env.VENICE_API_KEY
  if (!apiKey) throw new Error('VENICE_API_KEY missing')
  const res = await fetch('https://api.venice.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: clean, voice: voiceId, response_format: 'mp3' }),
  })
  if (!res.ok) throw new Error(`Venice TTS ${res.status}`)
  const audio = Buffer.from(await res.arrayBuffer())
  // caching is best-effort, a read-only FS must never fail the request
  try {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })
    writeFileSync(pathFor(key), audio)
  } catch { /* skip cache; still return the audio */ }
  return { key, audio }
}
