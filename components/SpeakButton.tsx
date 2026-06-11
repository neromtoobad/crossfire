'use client'

// SpeakButton — plays an oracle's line aloud in its own Venice voice.
// First click fetches + caches the audio; replays are instant. Safe to nest
// inside a <Link> card: it stops the click from navigating.

import { useRef, useState } from 'react'
import { CF, alpha } from '../lib/theme'

type Props = {
  handle: string          // oracle handle (PHOENIX …) → resolves its voice server-side
  text: string            // the line to speak
  color?: string          // accent (defaults to gold)
  label?: string          // override button text (default: "HEAR {handle}")
  size?: 'sm' | 'md'
}

type State = 'idle' | 'loading' | 'playing' | 'error'

export function SpeakButton({ handle, text, color = CF.gold, label, size = 'md' }: Props) {
  const [state, setState] = useState<State>('idle')
  const urlRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // already playing → stop
    if (state === 'playing') {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.currentTime = 0
      setState('idle')
      return
    }

    // cached audio → replay instantly
    if (urlRef.current) {
      play(urlRef.current)
      return
    }

    setState('loading')
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, text }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      play(url)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  function play(url: string) {
    const a = new Audio(url)
    audioRef.current = a
    a.onended = () => setState('idle')
    a.onerror = () => setState('error')
    a.play().then(() => setState('playing')).catch(() => setState('error'))
  }

  const sm = size === 'sm'
  const icon = state === 'loading' ? '◌' : state === 'playing' ? '❚❚' : state === 'error' ? '!' : '▶'
  const txt = state === 'loading' ? 'LOADING' : state === 'playing' ? 'STOP'
    : state === 'error' ? 'RETRY' : (label ?? `HEAR ${handle}`)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Hear ${handle} speak`}
      className="cf-press"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: sm ? 5 : 7,
        padding: sm ? '4px 9px' : '6px 12px',
        borderRadius: 999, cursor: 'pointer',
        background: state === 'playing' ? alpha(color, 16) : 'transparent',
        border: `1px solid ${alpha(color, state === 'idle' ? 32 : 55)}`,
        color, fontFamily: CF.mono, fontSize: sm ? 9.5 : 10.5,
        fontWeight: 700, letterSpacing: 0.8, lineHeight: 1,
        transition: 'background 160ms ease, border-color 160ms ease',
      }}
    >
      <span style={{
        fontSize: sm ? 8 : 9,
        display: 'inline-block',
        animation: state === 'loading' ? 'cf-spin 0.8s linear infinite' : undefined,
      }}>{icon}</span>
      {txt}
    </button>
  )
}
