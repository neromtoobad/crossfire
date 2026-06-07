'use client'

// Light/dark switch. The actual theme is set pre-paint by the inline script in
// app/layout.tsx (reads localStorage('cf-theme') or the OS preference); this
// button just flips data-theme on <html> and persists the choice. Shows a moon
// in light mode (→ go dark) and a sun in dark mode (→ go light).

import { useEffect, useState } from 'react'
import { CF } from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const cur = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light'
    setTheme(cur)
    setMounted(true)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('cf-theme', next) } catch { /* ignore */ }
    setTheme(next)
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, padding: 0,
        background: CF.surface, color: CF.ink2,
        border: `1px solid ${CF.line}`, borderRadius: CF.radius.md,
        cursor: 'pointer', boxShadow: CF.shadow.card,
        // avoid a flash of the wrong icon before we read the attribute
        opacity: mounted ? 1 : 0, transition: 'opacity 0.2s ease, color 0.2s ease',
      }}
    >
      {isDark ? (
        // sun
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // moon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
