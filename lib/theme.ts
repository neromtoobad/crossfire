// CROSSFIRE design tokens — Phase 8.11, dark-mode-enabled Phase 9.5.
//
// Editorial system, now theme-switchable. Every color token resolves to a CSS
// variable whose value is defined in app/layout.tsx for :root (light) and
// :root[data-theme="dark"] (dark). Because all components import CF.*, flipping
// these to var() re-themes the entire site without touching a single component.
//
// Non-color tokens (fonts, radius, spacing) are theme-independent and stay raw.
//
// Typography pairing: Fraunces (variable display serif) + Inter (UI body)
// + JetBrains Mono (tx hashes, status codes, data only — NOT body).

export const CF = {
  // ── surfaces ──────────────────────────────────────────────────────────
  bg:        'var(--cf-bg)',        // page
  surface:   'var(--cf-surface)',   // cards / panels
  surface2:  'var(--cf-surface-2)', // inset / log backgrounds
  surface3:  'var(--cf-surface-3)', // section bands

  // ── ink (text) ────────────────────────────────────────────────────────
  ink:       'var(--cf-ink)',
  ink2:      'var(--cf-ink-2)',
  ink3:      'var(--cf-ink-3)',
  ink4:      'var(--cf-ink-4)',

  // ── lines ─────────────────────────────────────────────────────────────
  line:      'var(--cf-line)',
  line2:     'var(--cf-line-2)',
  lineDark:  'var(--cf-line-dark)',

  // ── semantic accents ──────────────────────────────────────────────────
  bull:        'var(--cf-bull)',
  bullTint:    'var(--cf-bull-tint)',
  bullInk:     'var(--cf-bull-ink)',
  bear:        'var(--cf-bear)',
  bearTint:    'var(--cf-bear-tint)',
  bearInk:     'var(--cf-bear-ink)',
  amber:       'var(--cf-amber)',
  amberTint:   'var(--cf-amber-tint)',
  gold:        'var(--cf-gold)',
  goldTint:    'var(--cf-gold-tint)',
  positive:    'var(--cf-positive)',
  positiveTint:'var(--cf-positive-tint)',

  // ── fonts ─────────────────────────────────────────────────────────────
  display: "'Fraunces', 'Source Serif 4', Georgia, serif",
  body:    "'Inter', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",

  // ── radius / shadow ───────────────────────────────────────────────────
  radius: { sm: 4, md: 6, lg: 8, xl: 10 },
  shadow: {
    card:    'var(--cf-shadow-card)',
    hover:   'var(--cf-shadow-hover)',
    pop:     'var(--cf-shadow-pop)',
  },

  // ── spacing scale (8pt) ───────────────────────────────────────────────
  s: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64, '4xl': 96 },
} as const

// Translucent version of any color (hex, var(), named). Use instead of the old
// `${color}33` hex-alpha concatenation, which breaks once colors are var()s.
// percent is the OPACITY of the color over transparent (e.g. 20 ≈ old "33").
export const alpha = (color: string, percent: number): string =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`

// Helpers
export const pill = (color: string, tint: string): React.CSSProperties => ({
  padding: '3px 9px',
  borderRadius: 999,
  background: tint,
  border: `1px solid ${color}`,
  color,
  fontFamily: CF.mono,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
})

export const card: React.CSSProperties = {
  background: CF.surface,
  border: `1px solid ${CF.line}`,
  borderRadius: CF.radius.lg,
  boxShadow: CF.shadow.card,
}

export const monoNumeric: React.CSSProperties = {
  fontFamily: CF.mono,
  fontVariantNumeric: 'tabular-nums',
}
