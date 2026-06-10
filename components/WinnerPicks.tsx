'use client'

// THE AGENTS' WORLD CUP PICKS — HUD-style agent cards. Each agent (Venice-
// generated robot portrait) backs one nation and pitches YOU to follow it.
// VIEW ARGUMENT → the War Room, where they defend the pick live.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { A } from '../lib/arena'
import { PUNDITS } from '../lib/pundits'

type Pick = { role: string; handle: string; country: string; flag: string; reason: string }

const PUNDIT_LIST = Object.values(PUNDITS)
const punditByHandle = (h: string) => PUNDIT_LIST.find((p) => p.handle === h)

// HUD corner brackets — four glowing corners in the agent's colour
function Corners({ color }: { color: string }) {
  const s: React.CSSProperties = { position: 'absolute', width: 14, height: 14, pointerEvents: 'none' }
  const b = `2px solid ${color}`
  return (
    <>
      <span style={{ ...s, top: -1, left: -1, borderTop: b, borderLeft: b, borderTopLeftRadius: 8 }} />
      <span style={{ ...s, top: -1, right: -1, borderTop: b, borderRight: b, borderTopRightRadius: 8 }} />
      <span style={{ ...s, bottom: -1, left: -1, borderBottom: b, borderLeft: b, borderBottomLeftRadius: 8 }} />
      <span style={{ ...s, bottom: -1, right: -1, borderBottom: b, borderRight: b, borderBottomRightRadius: 8 }} />
    </>
  )
}

export function WinnerPicks({ winRates = {} }: { winRates?: Record<string, number> }) {
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
          Five agents. Five pitches. Who do you follow?
        </h2>
        <p style={{ fontSize: 14.5, color: A.text2, lineHeight: 1.55, margin: '8px 0 0', maxWidth: 620 }}>
          Each agent backs a nation to lift the trophy — and makes its case to you directly.
          Open an argument to watch them defend it in the <Link href="/lab?topic=winner" style={{ color: A.gold }}>War Room</Link>.
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
              <button onClick={generate} className="cf-press" style={{
                padding: '11px 20px', borderRadius: A.radius.md, border: 'none', cursor: 'pointer',
                background: `linear-gradient(180deg, ${A.goldBright}, ${A.goldDim})`, color: '#1a1305', fontFamily: A.body, fontWeight: 700, fontSize: 13,
              }}>✦ Run the agents · Venice</button>
            </>
          )}
        </div>
      ) : (
        <div className="cf-g5 cf-stagger">
          {picks.map((p) => {
            const agent = punditByHandle(p.handle)
            const c = agent?.color ?? A.gold
            const win = winRates[p.handle]
            return (
              <Link key={p.handle} href="/lab?topic=winner" className="cf-card" style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                background: `linear-gradient(180deg, ${A.panel2} 0%, #07090f 100%)`,
                border: `1px solid ${c}44`, borderRadius: 10, overflow: 'hidden',
                boxShadow: `0 0 22px ${c}1a, inset 0 0 30px rgba(0,0,0,0.5)`,
              }}>
                <Corners color={c} />
                {/* header — handle · persona · win rate */}
                <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${c}26` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: A.mono, fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: A.cream }}>{p.handle}</span>
                    {typeof win === 'number' ? (
                      <span className="mono tnum" style={{ fontSize: 12, fontWeight: 700, color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: '1px 6px' }}>{win}%</span>
                    ) : null}
                  </div>
                  <div className="mono" style={{ fontSize: 9.5, letterSpacing: 0.8, color: c, marginTop: 3 }}>{agent?.persona ?? agent?.archetype}</div>
                  {typeof win === 'number' ? (
                    <div className="mono" style={{ fontSize: 8.5, letterSpacing: 1, color: A.text3, marginTop: 2 }}>WIN RATE</div>
                  ) : null}
                </div>
                {/* Venice robot portrait */}
                <div style={{ position: 'relative', aspectRatio: '4 / 3.4', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={agent?.portrait} alt={`${p.handle} — AI agent`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, rgba(4,6,10,0.92) 96%)` }} />
                </div>
                {/* the pick + the pitch */}
                <div style={{ padding: '0 14px 14px', marginTop: -8, position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{p.flag}</span>
                    <span style={{ fontFamily: A.mono, fontSize: 17, fontWeight: 700, letterSpacing: 1.2, color: c, textShadow: `0 0 12px ${c}66` }}>{p.country.toUpperCase()}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: A.text, lineHeight: 1.55, fontStyle: 'italic', flex: 1 }}>
                    “{p.reason}”
                  </div>
                  <div className="mono" style={{
                    marginTop: 12, padding: '8px 0', textAlign: 'center',
                    border: `1px solid ${c}55`, borderRadius: 6, color: c,
                    fontSize: 10.5, fontWeight: 700, letterSpacing: 2,
                    background: `${c}0d`,
                  }}>
                    VIEW ARGUMENT
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
