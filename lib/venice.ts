// Phase 3, Prompt 3.3. Venice is the ONLY decision engine. No fallbacks.
// No other LLM provider may appear anywhere in the repo (`grep -r`-enforced).
//
// Two surfaces:
//   - conviction(side, evidence, remainingCapUsdc) → JSON verdict with stake size
//   - verdictCard(decision) → Venice image endpoint, the on-screen "Venice in
//     the main flow" artifact that judges remember
//
// Venice is OpenAI-compatible, so we use the openai SDK with baseURL swap.
// Venice-specific extensions (e.g. enable_web_scraping) are sent as extra
// body fields the OpenAI SDK passes through unmodified.

import OpenAI from 'openai'
import { env as envVars } from './env.js'
import type { EvidenceItem } from './x402-types.js'

// Construct without throwing at import (a top-level throw breaks `next build`
// before the key is set on the deploy). If VENICE_API_KEY is genuinely missing,
// the placeholder makes the real Venice call fail loudly at runtime (401) -
// still NO fallback engine, just the failure deferred from build to request.
export const venice = new OpenAI({
  apiKey: envVars.VENICE_API_KEY ?? 'VENICE_API_KEY-not-set',
  baseURL: 'https://api.venice.ai/api/v1',
})

// Model choices, both Venice-native, picked deliberately (no non-Venice
// routing models that would muddy the "Venice as sole engine" track claim).
const CONVICTION_MODEL = 'qwen3-235b-a22b-instruct-2507' // instruct, schema, web-search
const IMAGE_MODEL = 'flux-2-pro'

/** A single side's verdict, what the agent commits to. */
export type Conviction = {
  side: 'YES' | 'NO'
  estProb: number      // agent's estimate of P(YES)
  impliedProb: number  // market-implied P(YES) at decision time
  edge: number         // signed: + means this side is favored, - means against
  stakeUsdc: number    // dollar amount the agent stakes, clamped to remainingCap
  rationale: string    // 1-2 sentence justification
}

/**
 * Ask Venice to produce a conviction object arguing the given side.
 *
 * - The system prompt locks the model to ONE side (Bull=YES, Bear=NO).
 * - Stake scales with |edge|, clamped to remainingCapUsdc, 0 if edge below threshold.
 */
export async function conviction({
  side,
  evidence,
  remainingCapUsdc,
  impliedProb = 0.5,
  marketQuestion = 'Will the outcome resolve YES?',
}: {
  side: 'YES' | 'NO'
  evidence: EvidenceItem[]
  remainingCapUsdc: number
  impliedProb?: number
  marketQuestion?: string
}): Promise<Conviction> {
  const arguing = side === 'YES' ? 'YES' : 'NO'

  const systemPrompt = [
    `You are a calibrated prediction-market analyst arguing ONLY the ${arguing} side.`,
    `You may not concede or hedge. Your role is to find the strongest steelman for ${arguing}.`,
    ``,
    `Output a single JSON object, no markdown, no fences, no commentary. Schema:`,
    `{`,
    `  "side": "${arguing}",`,
    `  "estProb": <0..1>,           // YOUR estimate of P(YES), as a YES-perspective probability`,
    `  "impliedProb": ${impliedProb}, // echo input`,
    `  "edge": <number>,            // signed: +X means ${arguing} is favored by X over market`,
    `  "stakeUsdc": <0..${remainingCapUsdc}>, // dollars you stake, must be 0 if |edge|<0.05; otherwise ≈ |edge|×${remainingCapUsdc}×2, clamped`,
    `  "rationale": "<one or two sentences>"`,
    `}`,
  ].join('\n')

  const evidenceText = evidence
    .map(
      (e, i) =>
        `[${i + 1}] signal=${e.signal} weight=${e.weight} source=${e.sourceUrl}`,
    )
    .join('\n')

  const userPrompt = [
    `Market: ${marketQuestion}`,
    `Market-implied P(YES) right now: ${impliedProb}`,
    `Your remaining budget cap: ${remainingCapUsdc} USDC`,
    ``,
    `Evidence you bought (read the URLs if useful):`,
    evidenceText,
    ``,
    `Now produce your JSON verdict arguing the ${arguing} side.`,
  ].join('\n')

  const response = await venice.chat.completions.create({
    model: CONVICTION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    // Venice extension, OpenAI SDK passes unknown fields through.
    // @ts-expect-error venice-specific param not in OpenAI typings
    venice_parameters: { enable_web_scraping: true },
  })

  const content = response.choices?.[0]?.message?.content
  if (!content) throw new Error('Venice returned no content')

  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    throw new Error(`Venice returned non-JSON: ${content.slice(0, 200)}`)
  }

  // Validate + normalize
  const result: Conviction = {
    side: parsed.side === 'YES' || parsed.side === 'NO' ? parsed.side : arguing,
    estProb: clamp01(num(parsed.estProb, 0.5)),
    impliedProb: clamp01(num(parsed.impliedProb, impliedProb)),
    edge: num(parsed.edge, 0),
    stakeUsdc: clamp(num(parsed.stakeUsdc, 0), 0, remainingCapUsdc),
    rationale: String(parsed.rationale ?? '').slice(0, 400),
  }

  // Server-side guardrail on the stake, the prompt asks for clamping but we
  // verify here too so a malformed model output can't slip a too-large stake.
  if (Math.abs(result.edge) < 0.05) result.stakeUsdc = 0
  if (result.side !== arguing) {
    throw new Error(`Venice returned wrong side: expected ${arguing}, got ${result.side}`)
  }

  return result
}

// ── Small validation helpers ───────────────────────────────────────────────
function num(x: unknown, fallback: number): number {
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? n : fallback
}
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi)
}
function clamp01(x: number): number {
  return clamp(x, 0, 1)
}

/**
 * Render the verdict as a card via Venice's image endpoint.
 * Returns either a URL (most common) or a base64 data URI if the model
 * returns one. The dashboard displays this directly.
 */
export async function verdictCard(c: Conviction): Promise<{ url?: string; b64?: string }> {
  const color = c.side === 'YES' ? 'emerald green' : 'deep red'
  const prompt = [
    `Minimalist prediction-market verdict card on a dark background.`,
    `Centered ${color} block letter "${c.side}".`,
    `Below: "stake ${c.stakeUsdc.toFixed(2)} USDC".`,
    `Subtitle: "${c.rationale.slice(0, 80)}".`,
    `Editorial poster aesthetic, high contrast, no clutter, 1:1 square.`,
  ].join(' ')

  const res = await venice.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: '1024x1024',
  })
  const item = res.data?.[0]
  if (!item) throw new Error('Venice image endpoint returned no data')
  return { url: (item as any).url, b64: (item as any).b64_json }
}
