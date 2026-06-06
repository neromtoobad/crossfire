// CROSSFIRE design tokens — Phase 8.11.
//
// Editorial-light system: warm off-white "newsroom paper" background,
// near-black ink, refined royal-blue Bull / crimson Bear semantic accents,
// editorial gold for on-chain moments. One subtle shadow, hairline borders,
// 8pt spacing, tabular figures everywhere numbers live.
//
// Typography pairing: Fraunces (variable display serif, editorial voice)
// + Inter (precision grotesque, UI body) + JetBrains Mono (tx hashes,
// status codes, data only — NOT body).

export const CF = {
  // ── surfaces ──────────────────────────────────────────────────────────
  bg:        '#FAFAF7',  // page — warm off-white, newsroom paper
  surface:   '#FFFFFF',  // cards / panels
  surface2:  '#F4F4EE',  // inset / log backgrounds
  surface3:  '#EDEBE3',  // section bands

  // ── ink (text) ────────────────────────────────────────────────────────
  ink:       '#0B0C0F',  // primary text, near-black
  ink2:      '#52525B',  // secondary text
  ink3:      '#8B8B92',  // tertiary / captions
  ink4:      '#A1A1AA',  // labels at rest

  // ── lines ─────────────────────────────────────────────────────────────
  line:      '#E7E5E0',  // warm hairline (default border)
  line2:     '#D4D4CE',  // emphasized divider
  lineDark:  '#0B0C0F',  // editorial 4px section rule

  // ── semantic accents (refined, NOT neon) ──────────────────────────────
  bull:        '#1D4ED8',  // royal blue
  bullTint:    '#EFF4FF',  // pill / chip background
  bullInk:     '#1E3A8A',  // text on bull tint
  bear:        '#B91C1C',  // crimson
  bearTint:    '#FEF2F2',
  bearInk:     '#7F1D1D',
  amber:       '#B45309',  // neutral-warning
  amberTint:   '#FEF3C7',
  gold:        '#A16207',  // editorial gold — "on-chain ✓"
  goldTint:    '#FEF7E0',
  positive:    '#15803D',  // success green (alt)
  positiveTint:'#ECFDF5',

  // ── fonts ─────────────────────────────────────────────────────────────
  display: "'Fraunces', 'Source Serif 4', Georgia, serif",
  body:    "'Inter', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",

  // ── radius / shadow ───────────────────────────────────────────────────
  radius: { sm: 4, md: 6, lg: 8, xl: 10 },
  shadow: {
    card:    '0 1px 2px rgba(11,12,15,0.04)',
    hover:   '0 4px 12px rgba(11,12,15,0.06)',
    pop:     '0 6px 24px rgba(11,12,15,0.08)',
  },

  // ── spacing scale (8pt) ───────────────────────────────────────────────
  s: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64, '4xl': 96 },
} as const

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
