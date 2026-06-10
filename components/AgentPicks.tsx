'use client'

// An agent's full pick sheet. The one-liner is free; the detailed reasoning
// behind a pick unlocks with an x402 nano-payment (USDC). The thesis content
// never ships to the client — the server returns it only after payment.

import { useState } from 'react'
import Link from 'next/link'
import { UnlockThesis } from './UnlockThesis'
import type { PublishedCall } from '../lib/calls-data'
import { CF, alpha } from '../lib/theme'

export type AgentPickRow = {
  callId: string
  marketTitle: string
  unlockUsdc: number
  vote: 'YES' | 'NO' | 'ABSTAIN'
  confidence: number
  oneLiner: string
  outcome: 'hit' | 'miss' | 'pending'
  hasThesis: boolean
}

export function AgentPicks({ picks, color }: { picks: AgentPickRow[]; color: string }) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {picks.map((p) => {
        const oc = p.outcome === 'hit' ? CF.positive : p.outcome === 'miss' ? CF.bear : CF.ink3
        const ocLabel = p.outcome === 'hit' ? '✓ HIT' : p.outcome === 'miss' ? '✗ MISS' : 'OPEN'
        const voteColor = p.vote === 'YES' ? CF.bull : CF.bear
        const expanded = open === p.callId
        return (
          <div key={p.callId} style={{
            background: CF.surface, border: `1px solid ${CF.line}`,
            borderLeft: `3px solid ${oc}`, borderRadius: CF.radius.lg, padding: '14px 18px', boxShadow: CF.shadow.card,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <Link href={`/calls/${p.callId}`} style={{ flex: 1, minWidth: 0, fontFamily: CF.body, fontWeight: 600, fontSize: 14.5, color: CF.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.marketTitle}
              </Link>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: voteColor, padding: '2px 7px', borderRadius: CF.radius.sm, background: alpha(voteColor, 12) }}>
                {p.vote} {Math.round(p.confidence * 100)}%
              </span>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: oc, width: 50, textAlign: 'right' }}>{ocLabel}</span>
            </div>
            <div style={{ fontFamily: CF.body, fontSize: 13.5, color: CF.ink2, lineHeight: 1.5, fontStyle: 'italic' }}>
              “{p.oneLiner}”
            </div>
            {p.hasThesis ? (
              <div style={{ marginTop: 10 }}>
                {expanded ? (
                  <div className="cf-rise">
                    <UnlockThesis call={{ id: p.callId, unlockUsdc: p.unlockUsdc, marketTitle: p.marketTitle } as unknown as PublishedCall} />
                  </div>
                ) : (
                  <button onClick={() => setOpen(p.callId)} className="cf-press" style={{
                    padding: '7px 14px', borderRadius: CF.radius.md, cursor: 'pointer',
                    background: 'transparent', border: `1px solid ${alpha(color, 40)}`, color,
                    fontFamily: CF.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: 1,
                  }}>
                    🔒 UNLOCK FULL REASONING · {p.unlockUsdc.toFixed(2)} USDC
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
