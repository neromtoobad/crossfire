// Arena theme — the dark "broadcast gold" palette from the design.
// Self-contained (independent of the light/dark CF tokens) so the arena
// surfaces always render in the broadcast look.

export const A = {
  bg:        '#03070C', // deep blue-black page
  bg2:       '#070E16',
  panel:     '#0B121B', // dark slate panel
  panel2:    '#0F1822',
  border:    'rgba(232,194,84,0.16)', // faint gold hairline
  borderDim: '#1A2430',

  gold:       '#E8C254',
  goldBright: '#F4DA82',
  goldDim:    '#9A7B2E',
  goldTint:   'rgba(232,194,84,0.08)',

  cream: '#F0E9D7', // primary heading text
  text:  '#CFC9BB', // body
  text2: '#8E8979', // secondary
  text3: '#5F5B4E', // faint/labels

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
