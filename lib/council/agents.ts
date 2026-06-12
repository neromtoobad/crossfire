// Phase 8.2, Venice-driven role agents. Each runs ONE Venice chat call
// with its role-specific system prompt + the user prompt below. Returns
// a typed AgentVote that lib/calls-data.ts already expects.

import { venice } from '../venice.js'
import type { AgentRole, AgentVote } from '../calls-data.js'
import { ROLE_PROMPTS, type RolePromptInput, skepticPrompt } from './prompts.js'
import { clampToWord } from './debate.js'

const COUNCIL_MODEL = 'qwen3-235b-a22b-instruct-2507'

// ── small validation helpers ────────────────────────────────────────────
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi)
}
function num(x: unknown, fallback: number): number {
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? n : fallback
}
function asVote(x: unknown): 'YES' | 'NO' | 'NEUTRAL' {
  const s = String(x ?? '').toUpperCase()
  if (s === 'YES' || s === 'NO' || s === 'NEUTRAL') return s as any
  return 'NEUTRAL'
}

// ── role agent (the 4 non-Skeptic agents) ────────────────────────────────
export async function runRoleAgent({
  role,
  marketTitle,
  impliedProbYes,
  evidenceContext,
}: {
  role: Exclude<AgentRole, 'Skeptic'>
  marketTitle: string
  impliedProbYes: number
  evidenceContext: string
}): Promise<AgentVote> {
  const systemPrompt = ROLE_PROMPTS[role]({ marketTitle, impliedProbYes, evidenceContext })

  const userPrompt = [
    `Market: "${marketTitle}"`,
    `Market-implied P(YES): ${(impliedProbYes * 100).toFixed(0)}%`,
    ``,
    `Evidence available to your role:`,
    evidenceContext || '(no role-specific evidence, reason from common-knowledge structural understanding only)',
    ``,
    `Now vote, with calibrated confidence. JSON only.`,
  ].join('\n')

  const res = await venice.chat.completions.create({
    model: COUNCIL_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    // @ts-expect-error - Venice extension passed straight through to API
    venice_parameters: { enable_web_scraping: true },
  })

  const content = res.choices?.[0]?.message?.content ?? '{}'
  let parsed: any
  try { parsed = JSON.parse(content) }
  catch { parsed = {} }

  return {
    role,
    vote: asVote(parsed.vote),
    confidence: clamp(num(parsed.confidence, 0.5), 0, 1),
    oneLiner: clampToWord(String(parsed.oneLiner ?? ''), 320) || `(${role} returned no rationale)`,
  }
}

// ── Skeptic, gets the other four votes, tries to refute the majority ──
export async function runSkeptic({
  marketTitle,
  impliedProbYes,
  majoritySide,
  otherVotes,
}: {
  marketTitle: string
  impliedProbYes: number
  majoritySide: 'YES' | 'NO'
  otherVotes: AgentVote[]
}): Promise<AgentVote> {
  const systemPrompt = skepticPrompt({
    marketTitle,
    impliedProbYes,
    majoritySide,
    votes: otherVotes.map((v) => ({
      role: v.role,
      vote: v.vote,
      confidence: v.confidence,
      oneLiner: v.oneLiner,
    })),
  })

  const userPrompt = `Output your verdict on the majority's call. JSON only.`

  const res = await venice.chat.completions.create({
    model: COUNCIL_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const content = res.choices?.[0]?.message?.content ?? '{}'
  let parsed: any
  try { parsed = JSON.parse(content) }
  catch { parsed = {} }

  return {
    role: 'Skeptic',
    vote: majoritySide,  // Skeptic acknowledges majority; confidence carries the veto signal
    confidence: clamp(num(parsed.confidence, 0.2), 0, 1),
    oneLiner: clampToWord(String(parsed.oneLiner ?? ''), 320) || `(Skeptic returned no refutation)`,
  }
}

// ── full thesis, final synthesis (run only when the gate passes) ──────
export async function generateThesis({
  marketTitle,
  side,
  impliedProbYes,
  selectedSideProb,
  votes,
  skeptic,
}: {
  marketTitle: string
  side: 'YES' | 'NO'
  impliedProbYes: number
  selectedSideProb: number
  votes: AgentVote[]
  skeptic: AgentVote
}): Promise<{ thesis: string; counterarguments: string }> {
  const sys = `You are the council's synthesist. Given the four role votes + the Skeptic's refutation, write:
1. THESIS: a 3-5 sentence paragraph explaining the call. Anchor in the specific role rationales. Specific over vague.
2. COUNTERARGUMENTS: a 2-3 sentence paragraph stating the strongest case AGAINST the call, lifting language from the Skeptic.

Output ONE JSON object, no markdown:
{ "thesis": "...", "counterarguments": "..." }`

  const usr = [
    `Market: "${marketTitle}"`,
    `Side selected: ${side}`,
    `Market-implied P(YES): ${(impliedProbYes * 100).toFixed(0)}%`,
    `Council estimate for P(${side}): ${(selectedSideProb * 100).toFixed(0)}%`,
    ``,
    `Role votes:`,
    ...votes.map((v) => `  ${v.role}: ${v.vote} (conf ${(v.confidence * 100).toFixed(0)}%), ${v.oneLiner}`),
    `  Skeptic refutation conf ${(skeptic.confidence * 100).toFixed(0)}%: ${skeptic.oneLiner}`,
  ].join('\n')

  const res = await venice.chat.completions.create({
    model: COUNCIL_MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const content = res.choices?.[0]?.message?.content ?? '{}'
  let parsed: any
  try { parsed = JSON.parse(content) }
  catch { parsed = {} }
  return {
    thesis: String(parsed.thesis ?? '').slice(0, 2000) || '(no thesis returned)',
    counterarguments: String(parsed.counterarguments ?? '').slice(0, 1000) || '(no counterarguments returned)',
  }
}
