'use client'

// Two standings, one toggle: "This World Cup" (2026 fixtures actually played,
// graded on the real result) vs "Career" (the all-time backtest record). The
// rich career table and the new World-Cup table are both server-rendered and
// passed in as nodes; this client wrapper just flips between them.

import { useState } from 'react'
import { CF, alpha } from '../lib/theme'

export function StandingsTabs({ worldCup, career, matchesPlayed }: {
  worldCup: React.ReactNode
  career: React.ReactNode
  matchesPlayed: number
}) {
  const [tab, setTab] = useState<'wc' | 'career'>('wc')
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <TabBtn active={tab === 'wc'} onClick={() => setTab('wc')} label="This World Cup" sub={`2026 · ${matchesPlayed} played`} />
        <TabBtn active={tab === 'career'} onClick={() => setTab('career')} label="Career" sub="all-time · backtest" />
      </div>
      {tab === 'wc' ? worldCup : career}
    </div>
  )
}

function TabBtn({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick} className="cf-press" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
      padding: '9px 16px', borderRadius: CF.radius.md, cursor: 'pointer', textAlign: 'left',
      background: active ? alpha(CF.gold, 12) : CF.surface,
      border: `1px solid ${active ? alpha(CF.gold, 45) : CF.line}`,
    }}>
      <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13.5, color: active ? CF.gold : CF.ink2 }}>{label}</span>
      <span className="mono" style={{ fontSize: 9.5, color: CF.ink4, letterSpacing: 0.4 }}>{sub}</span>
    </button>
  )
}
