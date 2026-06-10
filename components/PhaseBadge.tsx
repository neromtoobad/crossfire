// Visual surface for the match state machine — a status pill + a stepper.

import { PHASE_META, PHASE_ORDER, type MatchPhase } from '../lib/match-phase'
import { CF, alpha } from '../lib/theme'

function toneColor(tone: string): string {
  return tone === 'open' ? CF.positive : tone === 'live' ? CF.bear : tone === 'lock' ? CF.gold : CF.ink3
}

export function PhaseBadge({ phase, size = 'md' }: { phase: MatchPhase; size?: 'sm' | 'md' }) {
  const m = PHASE_META[phase]
  const c = toneColor(m.tone)
  const sm = size === 'sm'
  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: sm ? '2px 7px' : '3px 9px', borderRadius: 999,
      background: alpha(c, 12), color: c, border: `1px solid ${alpha(c, 30)}`,
      fontSize: sm ? 9 : 10, fontWeight: 700, letterSpacing: 1,
    }}>
      {phase === 'LIVE' ? <span className="cf-live-dot" aria-hidden style={{ background: c }} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />}
      {m.label}
    </span>
  )
}

// Horizontal lifecycle: OPEN → LOCKED → LIVE → SETTLED (+ receipts), current lit.
export function MatchLifecycle({ phase }: { phase: MatchPhase }) {
  const steps: { key: MatchPhase | 'RECEIPTS'; label: string }[] = [
    ...PHASE_ORDER.map((p) => ({ key: p, label: PHASE_META[p].label })),
    { key: 'RECEIPTS' as const, label: 'RECEIPTS' },
  ]
  const curIdx = PHASE_ORDER.indexOf(phase)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 8 }}>
      {steps.map((s, i) => {
        const stepIdx = s.key === 'RECEIPTS' ? (phase === 'SETTLED' ? 4 : 99) : PHASE_ORDER.indexOf(s.key as MatchPhase)
        const done = stepIdx < curIdx || (s.key === 'RECEIPTS' && phase === 'SETTLED')
        const current = s.key === phase
        const c = current ? toneColor(PHASE_META[phase].tone) : done ? CF.ink2 : CF.ink4
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            <span className="mono" style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: c,
              padding: '4px 9px', borderRadius: 6,
              background: current ? alpha(c, 12) : 'transparent',
              border: current ? `1px solid ${alpha(c, 30)}` : '1px solid transparent',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {current && phase === 'LIVE' ? <span className="cf-live-dot" aria-hidden style={{ background: c }} /> : null}
              {s.label}
            </span>
            {i < steps.length - 1 ? <span style={{ width: 16, height: 1, background: done ? CF.ink3 : CF.line }} /> : null}
          </div>
        )
      })}
    </div>
  )
}
