// Arena theme — the dark "broadcast gold" palette from the design.
// Self-contained (independent of the light/dark CF tokens) so the arena
// surfaces always render in the broadcast look.

export const A = {
  bg:        '#0A0806', // stadium-night warm black (matches --cf-bg)
  bg2:       '#110D08',
  panel:     '#14110B', // warm slate panel
  panel2:    '#1B1710',
  border:    'rgba(232,194,84,0.18)', // faint gold hairline
  borderDim: '#2A2417',

  gold:       '#EFC75A',
  goldBright: '#F7DE8A',
  goldDim:    '#9A7B2E',
  goldTint:   'rgba(239,199,90,0.09)',

  cream: '#F7EFDA', // primary heading text
  text:  '#D9CEB3', // body
  text2: '#A39879', // secondary
  text3: '#6C6452', // faint/labels

  green:     '#2BD46E',
  greenTint: 'rgba(43,212,110,0.12)',
  red:       '#F05A5A',
  redTint:   'rgba(240,90,90,0.12)',
  teal:      '#4FD1E0',

  display: "'Fraunces', 'Source Serif 4', Georgia, serif",
  body:    "'Inter', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",

  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
} as const

// money formatter — $6.42M, $920K, $1.2M
export function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toFixed(0)}`
}
