'use client'

// Ticking kickoff countdown for the featured live match. Renders a stable
// placeholder on SSR, then counts down on the client (no hydration mismatch).

import { useEffect, useState } from 'react'
import { A } from '../../lib/arena'

export function KickoffClock({ seconds = 9258 }: { seconds?: number }) {
  const [left, setLeft] = useState(seconds)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const hh = String(Math.floor(left / 3600)).padStart(2, '0')
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <span className="mono tnum" style={{
      color: A.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      visibility: mounted ? 'visible' : 'hidden',
    }}>
      {hh}:{mm}:{ss}
    </span>
  )
}
