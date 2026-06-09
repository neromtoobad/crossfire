// Phase 9.1 — the live debate engine.
//
// Instead of 5 parallel votes that never see each other, the council now
// DEBATES in sequential rounds. Each agent reads the running transcript and
// reacts to what came before — genuine agent-to-agent coordination.
//
//   Round 1 · Opening statements   — each role agent states a position
//   Round 2 · Rebuttal & revision  — each agent rebuts/defends, having read R1
//   Round 3 · The Skeptic           — cross-examines the emerging majority
//
// Every turn is STREAMED token-by-token from Venice, so the UI watches the
// argument form word by word. Each turn ends with a hidden POSITION marker
// we parse for the vote; the marker never reaches the client.

import { venice } from '../venice.js'
import type { AgentRole, AgentVote } from '../calls-data.js'
import { ROLE_PROMPTS } from './prompts.js'
import { PUNDITS, handleOf } from '../pundits.js'

// The live debate streams turn-by-turn, so it needs a fast Venice model that
// stays available under load (the heavy qwen3-235b decision model is frequently
// overloaded → 429). glm-4.7-flash is quick and reliable. Still Venice — the
// only provider. (Deeper conviction/scoring elsewhere can use the big model.)
const COUNCIL_MODEL = 'zai-org-glm-4.7-flash'

const ROLES = ['MacroScout', 'NewsHawk', 'CrowdPulse', 'BookWatcher'] as const
type RoleName = (typeof ROLES)[number]

// ── events the debate emits (folded into CouncilEvent) ───────────────────
export type DebateEvent =
  | { type: 'debate-round'; round: number; title: string }
  | { type: 'debate-turn-start'; round: number; role: AgentRole }
  | { type: 'debate-token'; round: number; role: AgentRole; token: string }
  | { type: 'debate-turn-end'; round: number; role: AgentRole; vote?: 'YES' | 'NO' | 'NEUTRAL'; confidence?: number }

type Emit = (e: DebateEvent) => void | Promise<void>

type DebateMessage = { role: AgentRole; round: number; text: string; vote?: string; confidence?: number }

// ── helpers ──────────────────────────────────────────────────────────────
function clamp(x: number, lo: number, hi: number): number { return Math.min(Math.max(x, lo), hi) }
function num(x: unknown, fb: number): number { const n = Number(x); return Number.isFinite(n) ? n : fb }
function asVote(x: unknown): 'YES' | 'NO' | 'NEUTRAL' {
  const s = String(x ?? '').toUpperCase()
  return s === 'YES' || s === 'NO' || s === 'NEUTRAL' ? (s as any) : 'NEUTRAL'
}

// Parse the trailing "POSITION: <side> CONFIDENCE: <0..1>" marker.
const MARKER_RE = /POSITION:\s*(YES|NO|NEUTRAL)\s*\|?\s*CONFIDENCE:\s*([0-9.]+)/i
function parsePosition(full: string): { vote: 'YES' | 'NO' | 'NEUTRAL'; confidence: number } {
  const m = full.match(MARKER_RE)
  if (!m) return { vote: 'NEUTRAL', confidence: 0.5 }
  return { vote: asVote(m[1]), confidence: clamp(num(m[2], 0.5), 0, 1) }
}

// Where the displayable prose ends (everything before the POSITION marker).
function visibleLen(full: string): number {
  const idx = full.search(/\n?\s*POSITION:/i)
  return idx >= 0 ? idx : full.length
}

// Stream one Venice completion, emitting only the prose (marker stripped).
async function streamTurn(
  systemPrompt: string,
  userPrompt: string,
  onToken: (t: string) => void | Promise<void>,
  temperature = 0.55,
): Promise<string> {
  // Open the stream with a short retry: Venice can 429/503 under load. We retry
  // the create() (before any tokens stream) so a transient overload doesn't kill
  // the turn.
  let stream: Awaited<ReturnType<typeof venice.chat.completions.create>> & AsyncIterable<unknown>
  let attempt = 0
  for (;;) {
    try {
      stream = (await venice.chat.completions.create({
        model: COUNCIL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 320,
        stream: true,
        // disable_thinking so a reasoning model streams the answer as content;
        // enable_web_scraping off to keep each turn lean.
        // @ts-expect-error - Venice extensions passed through the OpenAI SDK
        venice_parameters: { enable_web_scraping: false, disable_thinking: true },
      })) as Awaited<ReturnType<typeof venice.chat.completions.create>> & AsyncIterable<unknown>
      break
    } catch (e) {
      const status = (e as { status?: number })?.status
      if ((status !== 429 && status !== 503 && status !== 500) || attempt >= 3) throw e
      attempt++
      await new Promise((r) => setTimeout(r, 800 * attempt))
    }
  }

  // Hold back the trailing N chars while streaming so a partial "POSITION"
  // marker (which arrives before its ":") never escapes to the UI. The full
  // marker is "\n\nPOSITION: NO | CONFIDENCE: …"; 16 chars covers the prefix.
  const HOLDBACK = 16
  let full = ''
  let emitted = 0
  for await (const chunk of stream as AsyncIterable<{ choices?: { delta?: { content?: string | null; reasoning_content?: string | null } }[] }>) {
    // reasoning models may stream the answer in reasoning_content — read both
    const d = chunk.choices?.[0]?.delta
    const delta = d?.content || d?.reasoning_content || ''
    if (!delta) continue
    full += delta
    // If the complete marker is already present, cut there. Otherwise hold
    // back a tail that could be the start of the marker.
    let cut = full.search(/\n?\s*POSITION:/i)
    if (cut < 0) cut = Math.max(emitted, full.length - HOLDBACK)
    if (cut > emitted) {
      await onToken(full.slice(emitted, cut))
      emitted = cut
    }
  }
  // Final flush: emit whatever prose remains before the (now complete) marker.
  const finalVis = visibleLen(full)
  if (finalVis > emitted) {
    await onToken(full.slice(emitted, finalVis))
  }
  return full
}

// Format the running transcript for an agent's prompt.
function renderTranscript(transcript: DebateMessage[]): string {
  if (transcript.length === 0) return '(you are the first to speak)'
  return transcript
    .map((m) => `${handleOf(m.role)}: ${m.text.replace(MARKER_RE, '').trim()}`)
    .join('\n\n')
}

// ── role-agent debate persona (wraps the existing role prompt) ───────────
function debateSystemPrompt(role: RoleName, marketTitle: string, impliedProbYes: number, evidenceContext: string): string {
  const base = ROLE_PROMPTS[role]({ marketTitle, impliedProbYes, evidenceContext })
  // Strip the JSON output rules from the base prompt — we want prose now.
  const persona = base.split('Output ONE JSON object')[0].trim()
  const me = PUNDITS[role]
  const others = (Object.values(PUNDITS) as typeof me[])
    .filter((p) => p.role !== role)
    .map((p) => `${p.handle} (${p.archetype})`)
    .join(', ')
  const impliedPct = (impliedProbYes * 100).toFixed(0)
  return `${persona}

YOUR CHARACTER: you are ${me.handle}, "${me.archetype}". ${me.voice}

You are on a live World Cup punditry panel: ${others}. You are debating this match. Speak in the FIRST PERSON and fully IN CHARACTER as ${me.handle}, 2-4 punchy sentences, like a sharp pundit on a live panel. When another pundit has already spoken, reference them BY THEIR HANDLE (e.g. "${others.split(' ')[0]}") and either build on or push back against their point. Stay strictly in your lane (your domain). Be specific and evidence-anchored; no hedging filler.

CALIBRATION — the betting line prices YES at ${impliedPct}% (so NO at ${(100 - Number(impliedPct))}%). That line reflects sharp money — treat it as your PRIOR. If you call YES, anchor your confidence near ${impliedPct}%; if NO, near ${(100 - Number(impliedPct))}%. To push more than ~15 points beyond that anchor you need a specific, defensible reason — don't move far on vibes. The whole point is to find where the line is genuinely WRONG, not to restate it.

After your spoken argument, on a NEW LINE output EXACTLY this marker (it will be hidden from readers):
POSITION: YES|NO|NEUTRAL | CONFIDENCE: <0..1>

Confidence = how sure you are of YOUR side (a NO vote at 0.80 means 80% sure NO). 0.5 = coin-flip, 0.65 = moderate, 0.80 = strong, 0.92 = rare conviction. Vote NEUTRAL only if your domain genuinely has no signal.`
}

// ── the debate ───────────────────────────────────────────────────────────
export async function runDebate({
  marketTitle,
  impliedProbYes,
  evidenceFor,
  emit,
}: {
  marketTitle: string
  impliedProbYes: number
  evidenceFor: (role: RoleName) => string
  emit: Emit
}): Promise<{ roleVotes: AgentVote[]; skepticVote: AgentVote }> {
  const impliedPct = (impliedProbYes * 100).toFixed(0)

  // Run one role agent's turn against an explicit context (no shared state),
  // so a whole round's agents can stream CONCURRENTLY. Agents react ACROSS
  // rounds (R2 rebuts all of R1) — that's the A2A — while each round's four
  // calls run as one parallel wave. 9 sequential calls → 3 waves, ~3× faster.
  async function roleTurn(
    role: RoleName, round: number, context: DebateMessage[], roundInstruction: string,
  ): Promise<DebateMessage> {
    await emit({ type: 'debate-turn-start', round, role })
    const system = debateSystemPrompt(role, marketTitle, impliedProbYes, evidenceFor(role))
    const user = [
      `Market: "${marketTitle}"`,
      `Market-implied P(YES): ${impliedPct}%`,
      ``,
      `Evidence for your role:`,
      evidenceFor(role) || '(none — reason from your domain expertise)',
      ``,
      round === 1 ? `(This is the opening round — no transcript yet.)` : `Opening statements from the desk:`,
      round === 1 ? '' : renderTranscript(context),
      ``,
      roundInstruction,
    ].join('\n')

    const full = await streamTurn(system, user, (t) => emit({ type: 'debate-token', round, role, token: t }))
    const { vote, confidence } = parsePosition(full)
    const msg: DebateMessage = { role, round, text: full, vote, confidence }
    await emit({ type: 'debate-turn-end', round, role, vote, confidence })
    return msg
  }

  // ── Round 1 — Opening statements (parallel; agents open cold) ──────────
  await emit({ type: 'debate-round', round: 1, title: 'Opening statements' })
  const r1 = await Promise.all(ROLES.map((role) => roleTurn(role, 1, [],
    `Round 1 — your OPENING STATEMENT. In 2-3 sentences, state your read on whether this resolves YES, from your domain only.`)))

  // ── Round 2 — Rebuttal (parallel; each rebuts the FULL set of R1) ──────
  await emit({ type: 'debate-round', round: 2, title: 'Rebuttal & revision' })
  const r2 = await Promise.all(ROLES.map((role) => roleTurn(role, 2, r1,
    `Round 2 — REBUTTAL. You've read every opening above. In 2-3 sentences, name at least one colleague BY NAME and engage their argument directly — build on it or push back. State your FINAL position.`)))

  // Final role votes = each agent's round-2 position.
  const roleVotes: AgentVote[] = ROLES.map((role) => {
    const last = r2.find((m) => m.role === role)
    return {
      role,
      vote: asVote(last?.vote),
      confidence: clamp(num(last?.confidence, 0.5), 0, 1),
      oneLiner: oneLineFrom(last?.text ?? ''),
    }
  })

  // Provisional majority for the Skeptic to attack.
  const yes = roleVotes.filter((v) => v.vote === 'YES').length
  const no = roleVotes.filter((v) => v.vote === 'NO').length
  const majoritySide: 'YES' | 'NO' = yes >= no ? 'YES' : 'NO'

  // ── Round 3 — The Skeptic cross-examines ───────────────────────────────
  await emit({ type: 'debate-round', round: 3, title: 'The Skeptic' })
  await emit({ type: 'debate-turn-start', round: 3, role: 'Skeptic' })
  const skepticSystem = `You are the Skeptic on a prediction-market council — the adversary in the room. The four role agents have just debated and lean ${majoritySide}.

Your job: cross-examine. Make the STRONGEST possible case that the majority is WRONG. Name specific agents and attack their weakest assumption. You have no evidence of your own — you find the cracks in theirs. You VETO the call if your refutation reaches confidence ≥ 0.5.

Speak in the first person, 2-4 sharp sentences. Then on a NEW LINE output EXACTLY (hidden from readers):
POSITION: ${majoritySide} | CONFIDENCE: <0..1 — your confidence the majority is WRONG>

Confidence: 0.0-0.3 = the council is right, you concede; 0.3-0.5 = real concerns but not a veto; 0.5+ = strong refutation, you VETO.`
  const skepticUser = [
    `Market: "${marketTitle}"`,
    `Market-implied P(YES): ${impliedPct}%`,
    `The council leans: ${majoritySide}`,
    ``,
    `Full debate transcript:`,
    renderTranscript([...r1, ...r2]),
    ``,
    `Cross-examine the majority now in 2-3 sentences.`,
  ].join('\n')

  const skepticFull = await streamTurn(skepticSystem, skepticUser,
    (t) => emit({ type: 'debate-token', round: 3, role: 'Skeptic', token: t }), 0.6)
  const skepticPos = parsePosition(skepticFull)
  const skepticVote: AgentVote = {
    role: 'Skeptic',
    vote: majoritySide,
    confidence: clamp(num(skepticPos.confidence, 0.2), 0, 1),
    oneLiner: oneLineFrom(skepticFull),
  }
  await emit({ type: 'debate-turn-end', round: 3, role: 'Skeptic', vote: majoritySide, confidence: skepticVote.confidence })

  return { roleVotes, skepticVote }
}

// Reduce a multi-sentence debate turn to a single public-facing one-liner:
// take the first 1-2 sentences, strip the marker, cap length.
function oneLineFrom(text: string): string {
  const clean = text.replace(MARKER_RE, '').replace(/\s+/g, ' ').trim()
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean]
  const joined = sentences.slice(0, 2).join(' ').trim()
  return clampToWord(joined || clean, 320)
}

// Cap a string at `max` chars WITHOUT cutting a word in half. If it overflows,
// trim back to the last whitespace and append an ellipsis. Prevents the
// "…in the final days of his" mid-word truncation on cards.
export function clampToWord(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?-]+$/, '')
  return `${base}…`
}
