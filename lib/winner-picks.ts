// The agents' World Cup winner picks, each of the five agents backs ONE
// nation to lift the trophy and argues why, in character, via Venice. They may
// overlap. A short debate (rebuttals) is generated alongside. Cached to runtime
// state so the home shows real Venice output instantly.

import { venice } from './venice.js'
import { PUNDITS, PUNDIT_ROLES, type Pundit } from './pundits.js'
import type { AgentRole } from './calls-data.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

// A fast Venice model for this generative task (the heavy qwen3-235b decision
// model is frequently overloaded). Still Venice, the only provider.
const MODEL = 'zai-org-glm-4.7-flash'
const DIR = STATE_BASE
const FILE = resolve(DIR, 'winner-picks.json')

export type WinnerPick = { role: AgentRole; handle: string; country: string; flag: string; reason: string }
export type WinnerDebate = { handle: string; line: string }
export type WinnerData = { picks: WinnerPick[]; debate: WinnerDebate[]; ts: number }

const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷', Brazil: '🇧🇷', France: '🇫🇷', Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Netherlands: '🇳🇱', Belgium: '🇧🇪', Italy: '🇮🇹', Croatia: '🇭🇷', Uruguay: '🇺🇾',
  USA: '🇺🇸', 'United States': '🇺🇸', Mexico: '🇲🇽', Colombia: '🇨🇴', Morocco: '🇲🇦', Japan: '🇯🇵',
}
function flagOf(country: string): string {
  return FLAGS[country] ?? FLAGS[country?.replace(/\b(the )?/i, '')] ?? '🏳️'
}

export function getCachedWinnerPicks(): WinnerData | null {
  // runtime cache first (freshly generated), then the committed seed so a fresh
  // deploy shows real Venice output immediately
  try { return JSON.parse(readFileSync(FILE, 'utf8')) as WinnerData } catch { /* fall through */ }
  try { return JSON.parse(readFileSync(resolve(process.cwd(), 'lib/winner-picks.seed.json'), 'utf8')) as WinnerData } catch { return null }
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
}

export async function generateWinnerPicks(): Promise<WinnerData> {
  const roster = PUNDIT_ROLES.map((r) => {
    const p: Pundit = PUNDITS[r]
    return `- ${p.handle}, ${p.archetype}: ${p.blurb}`
  }).join('\n')

  const system = 'You are a sports desk of five distinct AI football analysts debating the 2026 FIFA World Cup. Reply with ONLY valid JSON, no prose, no markdown fences.'
  const user = `These five analysts each BACK ONE nation to WIN the 2026 World Cup, true to their lane:
${roster}

Rules:
- Each analyst picks exactly one nation. Picks MAY overlap (two analysts can back the same nation), only pick the same nation if the analyst genuinely would.
- Each gives a 1-2 sentence PITCH addressed directly to the bettor (second person, "you"), SELLING their pick with swagger and a concrete footballing reason, in their own voice and lane. They are competing to convince you to follow THEM.
- Then they DEBATE: 4 short rebuttal lines where analysts challenge each other's picks by name (e.g. VEGA jabs at ECHO's pick). One sentence each.

Return JSON exactly:
{"picks":[{"handle":"PHOENIX","country":"Brazil","reason":"..."}, ... all five ...],
 "debate":[{"handle":"VEGA","line":"..."}, ... 4 lines ...]}`

  // Venice can return 429 (model overloaded) under load, retry the same Venice
  // model with backoff. No non-Venice fallback (Venice is the only engine).
  let raw = ''
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await venice.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.8,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
        // Venice extension: GLM/qwen are reasoning models, disable thinking so
        // the JSON lands in content (passed through by the OpenAI SDK).
        venice_parameters: { disable_thinking: true },
      } as Parameters<typeof venice.chat.completions.create>[0])
      // reasoning models may still route output to reasoning_content, read both
      const msg = res.choices?.[0]?.message as { content?: string | null; reasoning_content?: string | null } | undefined
      raw = (msg?.content || msg?.reasoning_content || '').trim()
      if (raw) break
    } catch (e) {
      lastErr = e
      const status = (e as { status?: number })?.status
      if (status !== 429 && status !== 503 && status !== 500) throw e
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  if (!raw) throw (lastErr ?? new Error('Venice returned no content'))
  const parsed = JSON.parse(stripFences(raw)) as { picks?: { handle: string; country: string; reason: string }[]; debate?: WinnerDebate[] }

  // map handles → roles, attach flags; guarantee all five present in roster order
  const byHandle = new Map((parsed.picks ?? []).map((p) => [p.handle?.toUpperCase(), p]))
  const picks: WinnerPick[] = PUNDIT_ROLES.map((role) => {
    const p = PUNDITS[role]
    const got = byHandle.get(p.handle.toUpperCase())
    const country = got?.country?.trim() || 'Brazil'
    return { role, handle: p.handle, country, flag: flagOf(country), reason: got?.reason?.trim() || '-' }
  })
  const debate = (parsed.debate ?? []).filter((d) => d?.handle && d?.line).slice(0, 6)

  const data: WinnerData = { picks, debate, ts: Date.now() }
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(data, null, 2))
  return data
}
