'use client'

// THE AGENTS' WORLD CUP PICKS — each agent backs one nation to win it and
// argues why (Venice). Then they debate each other's picks. The core mechanic,
// front and centre on the home.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { A } from '../lib/arena'
import { PUNDITS } from '../lib/pundits'

type Pick = { role: string; handle: string; country: string; flag: string; reason: string }

const PUNDIT_LIST = Object.values(PUNDITS)
const colorOf = (handle: string) => PUNDIT_LIST.find((p) => p.handle === handle)?.color ?? A.gold
const avatarOf = (handle: string) => PUNDIT_LIST.find((p) => p.handle === handle)?.avatar ?? '•'

export function WinnerPicks() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/winner-picks').then((r) => r.json()).then((d) => {
      if (d.picks?.length) setPicks(d.picks)
    }).catch(() => {})
  }, [])

  async function generate() {
    setState('loading')
    try {
      const r = await fetch('/api/winner-picks', { method: 'POST' })
      const d = await r.json()
      if (d.picks?.length) { setPicks(d.picks); setState('idle') }
      else setState('error')
    } catch { setState('error') }
  }

  return (
    <section style={{ padding: '56px 0 0' }}>
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2.4, color: A.gold, marginBottom: 8 }}>THE AGENTS’ WORLD CUP PICKS</div>
        <h2 style={{ fontFamily: A.display, fontWeight: 600, fontSize: 'clamp(26px, 2.6vw, 34px)', letterSpacing: -0.8, color: A.cream, margin: 0 }}>
          Five agents back a winner — and they don’t agree
        </h2>
        <p style={{ fontSize: 14.5, color: A.text2, lineHeight: 1.55, margin: '8px 0 0', maxWidth: 600 }}>
          Each agent commits to one nation to lift the trophy and argues it in its own lane.
          Tap a pick to watch them defend it in the <Link href="/lab?topic=winner" style={{ color: A.gold }}>War Room →</Link>
        </p>
      </div>

      {picks.length === 0 ? (
        <div style={{ background: A.panel, border: `1px solid ${A.borderDim}`, borderRadius: A.radius.lg, padding: '40px 24px', textAlign: 'center' }}>
          {state === 'loading' ? (
            <>
              <div className="cf-think" style={{ display: 'inline-flex', gap: 6, marginBottom: 12 }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: A.gold }} />)}
              </div>
              <div className="mono" style={{ fontSize: 12.5, color: A.text2 }}>The agents are deliberating…</div>
              <div className="mono" style={{ fontSize: 10.5, color: A.text3, marginTop: 4 }}>Venice · 5 picks + a debate · this can take ~60s</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, color: A.text2, marginBottom: 14 }}>
                {state === 'error' ? 'Venice was busy — try again.' : 'Run the agents to see who they back to win the World Cup.'}
              </div>
              <button onClick={generate} style={{
                padding: '11px 20px', borderRadius: A.radius.md, border: 'none', cursor: 'pointer',
                background: `linear-gradient(180deg, ${A.goldBright}, ${A.goldDim})`, color: '#1a1305', fontFamily: A.body, fontWeight: 700, fontSize: 13,
              }}>✦ Run the agents · Venice</button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* the picks — each links into the War Room to watch the debate */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {picks.map((p) => {
              const c = colorOf(p.handle)
              return (
                <Link key={p.handle} href="/lab?topic=winner" className="cf-card" style={{ display: 'flex', flexDirection: 'column', background: A.panel, border: `1px solid ${A.borderDim}`, borderTop: `2px solid ${c}`, borderRadius: A.radius.lg, padding: '16px 15px', transition: 'transform 160ms ease, border-color 160ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: c + '1f', border: `1.5px solid ${c}`, color: c, fontFamily: A.mono, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{avatarOf(p.handle)}</span>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: A.cream, letterSpacing: 0.3 }}>{p.handle}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{p.flag}</span>
                    <span style={{ fontFamily: A.display, fontSize: 18, fontWeight: 600, color: A.gold, letterSpacing: -0.3 }}>{p.country}</span>
                  </div>
                  <div style={{ fontSize: 12, color: A.text2, lineHeight: 1.5, fontStyle: 'italic', flex: 1 }}>“{p.reason}”</div>
                  <div className="mono" style={{ fontSize: 9.5, color: A.gold, marginTop: 12, letterSpacing: 0.5 }}>Watch the debate →</div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
