'use client'

// THE ARENA — a live, audio-reactive debate visualisation on <canvas>.
// The five agents orbit a reactive core; whoever holds the floor erupts with an
// aura + a circular frequency spectrum driven by the ACTUAL voice (Web Audio
// AnalyserNode), fires energy beams at any rival it names, and throws particles
// on the loud beats. Falls back to a synthetic pulse if no analyser is live, so
// it always moves. Pure browser — no video gen.

import { useEffect, useRef } from 'react'
import { PUNDITS, PUNDIT_ROLES } from '../lib/pundits'
import type { AgentRole } from '../lib/calls-data'
import { CF } from '../lib/theme'
import { Equalizer } from './RoundTable'

type Speaking = { role: AgentRole; text: string } | null

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(f, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number }

export function DebateArena({
  speaking, positions, winnerPicks, isWinner, deliberating, analyserRef,
}: {
  speaking: Speaking
  positions: Partial<Record<AgentRole, { vote: string; confidence: number }>>
  winnerPicks: Record<string, { country: string; flag: string }>
  isWinner: boolean
  deliberating: boolean
  analyserRef: React.MutableRefObject<AnalyserNode | null>
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speakingRef = useRef<Speaking>(speaking)
  speakingRef.current = speaking
  const imgsRef = useRef<Record<string, HTMLImageElement>>({})
  const particlesRef = useRef<P[]>([])
  const beatRef = useRef(0)

  // load the agent portraits once
  useEffect(() => {
    PUNDIT_ROLES.forEach((role) => {
      const img = new Image()
      img.src = PUNDITS[role].portrait
      imgsRef.current[role] = img
    })
  }, [])

  // the render loop
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0, h = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = stage.clientWidth; h = stage.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(stage)

    const freq = new Uint8Array(128)
    const bg: P[] = Array.from({ length: 54 }, () => ({
      x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006,
      life: 1, max: 1, c: '#ffffff', r: Math.random() * 1.4 + 0.3,
    }))

    let t0 = 0
    const render = (t: number) => {
      if (!t0) t0 = t
      const time = (t - t0) / 1000
      const M = Math.min(w, h)
      const cx = w / 2, cy = h * 0.49
      const R = M * 0.30
      const baseNode = M * 0.066

      // amplitude + spectrum from the real voice, else a synthetic pulse
      const an = analyserRef.current
      let amp = 0
      let bins = 48
      const spectrum = new Float32Array(bins)
      if (an) {
        an.getByteFrequencyData(freq)
        let sum = 0
        for (let i = 0; i < freq.length; i++) sum += freq[i]
        amp = sum / freq.length / 255
        for (let i = 0; i < bins; i++) spectrum[i] = (freq[Math.floor((i / bins) * freq.length)] || 0) / 255
      }
      const sp = speakingRef.current
      if (sp && amp < 0.02) { // analyser silent (headless / not routed) → synthetic
        amp = 0.32 + 0.22 * (0.5 + 0.5 * Math.sin(time * 7))
        for (let i = 0; i < bins; i++) spectrum[i] = 0.3 + 0.5 * Math.abs(Math.sin(time * 6 + i * 0.5)) * (1 - i / bins)
      }
      const spPundit = sp ? PUNDITS[sp.role] : null
      const accent = spPundit?.color ?? CF.gold

      // motion-blur clear (trails)
      ctx.fillStyle = 'rgba(8,10,15,0.34)'
      ctx.fillRect(0, 0, w, h)
      // accent vignette
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7)
      vg.addColorStop(0, hexA(accent, 0.06 + amp * 0.05))
      vg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)

      // drifting background dust
      ctx.globalCompositeOperation = 'lighter'
      for (const p of bg) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0; if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
        ctx.fillStyle = hexA(accent, 0.18)
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2); ctx.fill()
      }

      // agent positions (pentagon, PHOENIX at top)
      const pos: Record<string, { x: number; y: number }> = {}
      PUNDIT_ROLES.forEach((role, i) => {
        const a = -Math.PI / 2 + (i / PUNDIT_ROLES.length) * Math.PI * 2
        let x = cx + Math.cos(a) * R
        let y = cy + Math.sin(a) * R * 0.86
        if (sp?.role === role) { x = x + (cx - x) * 0.20; y = y + (cy - y) * 0.20 } // speaker steps up
        pos[role] = { x, y }
      })

      // connection web
      ctx.lineWidth = 1
      for (let i = 0; i < PUNDIT_ROLES.length; i++) {
        for (let j = i + 1; j < PUNDIT_ROLES.length; j++) {
          const a = pos[PUNDIT_ROLES[i]], b = pos[PUNDIT_ROLES[j]]
          ctx.strokeStyle = hexA(accent, 0.06)
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
      }

      // central core — pulses with the voice
      const coreR = baseNode * (0.62 + amp * 0.9)
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4)
      cg.addColorStop(0, hexA(accent, 0.5 + amp * 0.3))
      cg.addColorStop(0.4, hexA(accent, 0.16))
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = hexA(accent, 0.6); ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.stroke()
      // rotating ring
      ctx.strokeStyle = hexA(accent, 0.28); ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 1.5 + Math.sin(time * 2) * 3, 0.4 + time, 0.4 + time + Math.PI * 1.2); ctx.stroke()

      // beams: speaker → core, and speaker → any rival it names
      if (sp) {
        const s = pos[sp.role]
        const drawBeam = (bx: number, by: number, col: string, intensity: number) => {
          const grad = ctx.createLinearGradient(s.x, s.y, bx, by)
          grad.addColorStop(0, hexA(col, 0.0))
          grad.addColorStop(0.5, hexA(col, 0.5 * intensity))
          grad.addColorStop(1, hexA(col, 0.0))
          ctx.strokeStyle = grad; ctx.lineWidth = 1.5 + amp * 3
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(bx, by); ctx.stroke()
          // travelling spark
          const k = (time * 0.9) % 1
          ctx.fillStyle = hexA(col, 0.9 * intensity)
          ctx.beginPath(); ctx.arc(s.x + (bx - s.x) * k, s.y + (by - s.y) * k, 2 + amp * 3, 0, Math.PI * 2); ctx.fill()
        }
        drawBeam(cx, cy, accent, 1)
        const text = (sp.text || '').toUpperCase()
        for (const role of PUNDIT_ROLES) {
          if (role === sp.role) continue
          if (text.includes(PUNDITS[role].handle)) drawBeam(pos[role].x, pos[role].y, PUNDITS[role].color, 0.8)
        }
        // beat → spawn particles
        beatRef.current = beatRef.current * 0.9 + amp * 0.1
        if (amp > 0.42 && Math.random() < 0.6) {
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2
            particlesRef.current.push({ x: s.x, y: s.y, vx: Math.cos(a) * (0.6 + amp * 2), vy: Math.sin(a) * (0.6 + amp * 2), life: 1, max: 1, c: accent, r: 1.5 + Math.random() * 2 })
          }
        }
      }

      // particles
      const ps = particlesRef.current
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 0.02
        if (p.life <= 0) { ps.splice(i, 1); continue }
        ctx.fillStyle = hexA(p.c, p.life * 0.8)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill()
      }
      if (ps.length > 260) ps.splice(0, ps.length - 260)

      ctx.globalCompositeOperation = 'source-over'

      // agent nodes
      PUNDIT_ROLES.forEach((role) => {
        const p = PUNDITS[role]
        const isLive = sp?.role === role
        const dim = !!sp && !isLive
        const { x, y } = pos[role]
        const nodeR = baseNode * (isLive ? 1.4 : 1)

        // aura for the speaker, sized by amplitude
        if (isLive) {
          const auraR = nodeR * (2.1 + amp * 1.6)
          const ag = ctx.createRadialGradient(x, y, nodeR * 0.6, x, y, auraR)
          ag.addColorStop(0, hexA(p.color, 0.55))
          ag.addColorStop(0.5, hexA(p.color, 0.18))
          ag.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2); ctx.fill()
          // circular frequency spectrum
          const innerR = nodeR * 1.2
          ctx.lineWidth = 2.2; ctx.lineCap = 'round'
          for (let i = 0; i < bins; i++) {
            const ang = (i / bins) * Math.PI * 2 - Math.PI / 2 + time * 0.3
            const len = innerR + spectrum[i] * nodeR * 0.95
            ctx.strokeStyle = hexA(p.color, 0.35 + spectrum[i] * 0.6)
            ctx.beginPath()
            ctx.moveTo(x + Math.cos(ang) * innerR, y + Math.sin(ang) * innerR)
            ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
            ctx.stroke()
          }
        }

        // portrait, clipped to a circle
        const img = imgsRef.current[role]
        ctx.save()
        ctx.beginPath(); ctx.arc(x, y, nodeR, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
        if (img && img.complete && img.naturalWidth) {
          ctx.globalAlpha = dim ? 0.5 : 1
          // cover-fit the circle with a slight zoom (so there's overflow to crop,
          // never a gap), biased toward the top of the portrait (the face)
          const D = nodeR * 2
          const s = Math.max(D / img.naturalWidth, D / img.naturalHeight) * 1.18
          const dw = img.naturalWidth * s, dh = img.naturalHeight * s
          ctx.drawImage(img, x - dw / 2, y - dh * 0.43, dw, dh)
          ctx.globalAlpha = 1
        } else {
          ctx.fillStyle = p.tint; ctx.fillRect(x - nodeR, y - nodeR, nodeR * 2, nodeR * 2)
        }
        ctx.restore()
        // ring
        ctx.strokeStyle = hexA(p.color, dim ? 0.4 : 1); ctx.lineWidth = isLive ? 2.5 : 1.6
        ctx.beginPath(); ctx.arc(x, y, nodeR, 0, Math.PI * 2); ctx.stroke()

        // label
        ctx.globalAlpha = dim ? 0.5 : 1
        ctx.fillStyle = isLive ? p.color : CF.ink
        ctx.font = `700 ${Math.round(baseNode * 0.34)}px ui-monospace, monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(p.handle, x, y + nodeR + 6)
        // pick / vote chip
        const pick = winnerPicks[role]
        const vote = positions[role]
        const sub = isWinner && pick ? `${pick.flag} ${pick.country}` : vote ? `${vote.vote} ${Math.round(vote.confidence * 100)}%` : ''
        if (sub) {
          ctx.fillStyle = hexA(p.color, 0.85)
          ctx.font = `600 ${Math.round(baseNode * 0.26)}px ui-monospace, monospace`
          ctx.fillText(sub, x, y + nodeR + 6 + baseNode * 0.42)
        }
        ctx.globalAlpha = 1
      })

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sp = speaking ? PUNDITS[speaking.role] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* the canvas stage — pure visualisation, nothing overlaps the agents */}
      <div ref={stageRef} style={{
        position: 'relative', width: '100%', aspectRatio: '16 / 10', maxHeight: 460, minHeight: 320,
        borderRadius: CF.radius.lg, overflow: 'hidden', background: '#080a0f',
        border: `1px solid ${CF.line}`, boxShadow: CF.shadow.card,
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
        {!speaking ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 14, textAlign: 'center', pointerEvents: 'none' }}>
            <span className="mono" style={{ fontSize: 10.5, letterSpacing: 1.6, color: deliberating ? CF.ink2 : CF.ink4 }}>
              {deliberating ? <><span className="cf-live-dot" style={{ width: 6, height: 6, display: 'inline-block', marginRight: 6 }} aria-hidden /> THE PANEL IS DELIBERATING…</> : '▸ OPEN THE FLOOR TO BEGIN'}
            </span>
          </div>
        ) : null}
      </div>

      {/* readable caption — BELOW the stage, never over the agents */}
      {speaking && sp ? (
        <div className="cf-rise" style={{
          background: `linear-gradient(90deg, ${hexA(sp.color, 0.16)}, ${CF.surface})`,
          border: `1px solid ${hexA(sp.color, 0.4)}`, borderLeft: `3px solid ${sp.color}`,
          borderRadius: CF.radius.lg, padding: '12px 16px', boxShadow: CF.shadow.card,
        }}>
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, color: sp.color }}>
            <span className="cf-live-dot" style={{ width: 6, height: 6 }} aria-hidden /> {sp.handle} · ON AIR
            <Equalizer color={sp.color} bars={14} height={13} />
          </div>
          <div style={{ fontFamily: CF.body, fontSize: 14.5, color: CF.ink, lineHeight: 1.5 }}>“{speaking.text}”</div>
        </div>
      ) : null}
    </div>
  )
}
