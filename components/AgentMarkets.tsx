'use client'

// AgentMarkets, the live, bettable markets THIS agent has called. Each row is
// collapsed to the market + the agent's own pick; expanding reveals a Fade or
// Follow scoped to that agent (follow its side, or fade it). Only one open at a
// time. Resolved calls live in the track record below, not here.

import { useState } from 'react'
import type { PublishedCall, AgentRole } from '../lib/calls-data'
import { PUNDITS } from '../lib/pundits'
import { FadeFollow } from './FadeFollow'
import { CF, alpha } from '../lib/theme'

// The paid thesis (locked) is deliberately NOT part of this type, it never
// ships to the client here.
export type LiveCall = Omit<PublishedCall, 'locked'>

export function AgentMarkets({ calls, role, color }: { calls: LiveCall[]; role: AgentRole; color: string }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const handle = PUNDITS[role].handle

  if (!calls.length) {
    return (
      <div className="mono" style={{ fontSize: 12.5, color: CF.ink3, padding: '14px 0' }}>
        No open markets right now, {handle}’s calls are all locked or settled. See the track record below.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {calls.map((c) => {
        const v = c.votes.find((x) => x.role === role)
        const side = v?.vote === 'YES' || v?.vote === 'NO' ? v.vote : c.side
        const sideColor = side === 'YES' ? CF.bull : CF.bear
        const isOpen = openId === c.id

        if (isOpen) {
          return (
            <div key={c.id} className="cf-rise" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setOpenId(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 2px',
                }}
              >
                <span style={{ fontFamily: CF.body, fontSize: 14.5, fontWeight: 600, color: CF.ink, lineHeight: 1.3 }}>
                  {c.marketTitle}
                </span>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: CF.ink3, whiteSpace: 'nowrap' }}>
                  Close ✕
                </span>
              </button>
              <FadeFollow call={c} agentRole={role} />
            </div>
          )
        }

        return (
          <button
            key={c.id}
            onClick={() => setOpenId(c.id)}
            className="cf-press"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: CF.surface, border: `1px solid ${CF.line}`,
              borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, padding: '14px 16px',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontFamily: CF.body, fontSize: 14.5, fontWeight: 600, color: CF.ink, lineHeight: 1.3 }}>
                {c.marketTitle}
              </span>
              <span className="mono" style={{ fontSize: 11, color: CF.ink3 }}>
                {handle} calls <span style={{ color: sideColor, fontWeight: 700 }}>{side}</span>
                {' · '}{Math.round((v?.confidence ?? 0.5) * 100)}%
              </span>
            </span>
            <span className="mono" style={{
              fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap', flexShrink: 0,
              border: `1px solid ${alpha(color, 40)}`, borderRadius: 999, padding: '6px 12px',
              background: alpha(color, 8),
            }}>
              Back / Fade →
            </span>
          </button>
        )
      })}
    </div>
  )
}
