import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'
import { Providers } from './providers'

export const metadata = {
  title: 'CROSSFIRE, five AI pundits call the World Cup',
  description: 'Five AI football pundits call the 2026 World Cup and stake real, chain-capped USDC on every match. Follow the ones you trust, fade the ones you don\'t. The winning side splits the pot.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(getConfig(), (await headers()).get('cookie'))

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Fraunces (variable serif, opsz + wght axes) for editorial display.
          Inter for body / UI. JetBrains Mono only for tx hashes + numerics.
        */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          /* ── CROSSFIRE "Trophy Gold", one theme, no toggle ──────────────
             Stadium-night warm black lit by World Cup gold. Pitch-green YES,
             red NO, gold for the brand + every call-to-action. Defined on :root
             and ANY data-theme value so a stale saved preference can never
             surface a light mode again. */
          :root, :root[data-theme] {
            --cf-bg: #0A0806; --cf-surface: #14110B; --cf-surface-2: #1B1710; --cf-surface-3: #221D14;
            --cf-ink: #F7EFDA; --cf-ink-2: #D9CEB3; --cf-ink-3: #A39879; --cf-ink-4: #6C6452;
            --cf-line: #2A2417; --cf-line-2: #3D341F; --cf-line-dark: #E8C254;
            --cf-bull: #2FCB7E; --cf-bull-tint: #0E2A1C; --cf-bull-ink: #A6ECC9;
            --cf-bear: #F0584F; --cf-bear-tint: #2C1411; --cf-bear-ink: #FFC9C2;
            --cf-amber: #F0C75E; --cf-amber-tint: #2A2210; --cf-gold: #EFC75A; --cf-gold-tint: #2A2410;
            --cf-positive: #2FCB7E; --cf-positive-tint: #0E2A1C;
            --cf-shadow-card: 0 1px 2px rgba(0,0,0,0.5);
            --cf-shadow-hover: 0 10px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,194,84,0.10);
            --cf-shadow-pop: 0 16px 42px rgba(0,0,0,0.72);
            --cf-noise: rgba(232,194,84,0.022);
            --cf-noise-opacity: 0.5;
            --cf-selection-bg: #EFC75A; --cf-selection-fg: #0A0806;
            --cf-underline: rgba(239,199,90,0.42);
            color-scheme: dark;
          }

          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0;
            background: var(--cf-bg);
            color: var(--cf-ink);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-feature-settings: 'ss01', 'cv11';
          }
          /* the gold: a spotlit trophy glow pooled at the top, a faint warm
             wash from the right, fixed so it sits behind the whole scroll. */
          body {
            background:
              radial-gradient(120% 72% at 50% -10%, rgba(239,199,90,0.13), transparent 56%),
              radial-gradient(70% 48% at 100% 2%, rgba(239,199,90,0.06), transparent 60%),
              var(--cf-bg);
            background-attachment: fixed;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 15px;
            line-height: 1.55;
          }
          /* Tabular figures default for any element with the .tnum class. */
          .tnum, .mono { font-variant-numeric: tabular-nums; }
          .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
          .serif { font-family: 'Fraunces', 'Source Serif 4', Georgia, serif; }
          a { color: inherit; text-decoration: none; }
          a:hover { text-decoration: underline; text-decoration-color: var(--cf-underline); text-underline-offset: 3px; }
          button { font-family: inherit; }
          ::selection { background: var(--cf-selection-bg); color: var(--cf-selection-fg); }
          /* Subtle paper noise, adds editorial warmth without taxing perf. */
          body::before {
            content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
            background-image: radial-gradient(var(--cf-noise) 1px, transparent 1px);
            background-size: 3px 3px;
            opacity: var(--cf-noise-opacity);
          }
          main { position: relative; z-index: 1; }
          /* feed cards lift on hover, a little life for the betting feed */
          .cf-card { transition: transform 180ms cubic-bezier(0.22,1,0.36,1), box-shadow 180ms ease, border-color 180ms ease; will-change: transform; }
          .cf-card:hover { transform: translateY(-2px); box-shadow: var(--cf-shadow-hover); border-color: var(--cf-line-2); }
          .cf-card:active { transform: translateY(0) scale(0.99); }
          /* ── motion toolkit ── */
          @keyframes cf-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.82); } }
          @keyframes cf-rise { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes cf-blink { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
          @keyframes cf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes cf-eq { 0%,100% { transform: scaleY(0.22); } 50% { transform: scaleY(1); } }
          @keyframes cf-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
          .cf-live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; background: #DC2626; animation: cf-pulse 1.5s ease-in-out infinite; }
          .cf-rise { animation: cf-rise 0.34s cubic-bezier(0.22,1,0.36,1) both; }
          .cf-think span { animation: cf-blink 1.1s infinite; }
          .cf-think span:nth-child(2) { animation-delay: 0.18s; }
          .cf-think span:nth-child(3) { animation-delay: 0.36s; }
          /* staggered entrance, apply .cf-stagger to a grid/list; children rise in sequence */
          .cf-stagger > * { animation: cf-rise 0.4s cubic-bezier(0.22,1,0.36,1) both; }
          .cf-stagger > *:nth-child(1) { animation-delay: 0.03s; }
          .cf-stagger > *:nth-child(2) { animation-delay: 0.08s; }
          .cf-stagger > *:nth-child(3) { animation-delay: 0.13s; }
          .cf-stagger > *:nth-child(4) { animation-delay: 0.18s; }
          .cf-stagger > *:nth-child(5) { animation-delay: 0.23s; }
          .cf-stagger > *:nth-child(6) { animation-delay: 0.28s; }
          .cf-stagger > *:nth-child(n+7) { animation-delay: 0.33s; }
          /* button + interactive press feedback (Linear/Raycast-style tap response) */
          .cf-press { transition: transform 120ms cubic-bezier(0.22,1,0.36,1), opacity 120ms ease, box-shadow 160ms ease; }
          .cf-press:hover { filter: brightness(1.06); }
          .cf-press:active { transform: scale(0.97); }
          /* visible keyboard focus, never remove, always on-brand */
          :focus-visible { outline: 2px solid var(--cf-gold); outline-offset: 2px; border-radius: 4px; }
          select, button, a { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
          /* ── responsive grid system, fixed multi-col grids collapse cleanly ── */
          .cf-g5, .cf-g4, .cf-g3, .cf-g2 { display: grid; gap: 14px; }
          .cf-g5 { grid-template-columns: repeat(5, 1fr); }
          .cf-g4 { grid-template-columns: repeat(4, 1fr); }
          .cf-g3 { grid-template-columns: repeat(3, 1fr); }
          .cf-g2 { grid-template-columns: repeat(2, 1fr); }
          @media (max-width: 920px) {
            .cf-g5 { grid-template-columns: repeat(3, 1fr); }
            .cf-g4 { grid-template-columns: repeat(2, 1fr); }
            .cf-g3 { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 600px) {
            .cf-g5, .cf-g4, .cf-g3, .cf-g2 { grid-template-columns: 1fr 1fr; }
            .cf-g5 > *, .cf-g4 > * { min-width: 0; }
          }
          @media (max-width: 430px) {
            .cf-g5, .cf-g3, .cf-g2 { grid-template-columns: 1fr; }
            .cf-g4 { grid-template-columns: 1fr 1fr; }
          }
          /* wide tables scroll inside their card instead of stretching the page */
          .cf-scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .cf-scroll-x > * { min-width: 640px; }
          /* divided strip, vertical separators between cells, desktop only
             (children with their own inline padding keep it, inline wins) */
          @media (min-width: 921px) { .cf-divided > * + * { border-left: 1px solid var(--cf-line); padding-left: 28px; } }
          /* nav wraps gracefully on small screens */
          .cf-nav { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; row-gap: 8px; }
          @media (max-width: 600px) {
            .cf-nav { gap: 12px; }
            .cf-hide-sm { display: none !important; }
            main { padding-left: 16px !important; padding-right: 16px !important; }
            /* every page header (logo · links · connect) wraps instead of overflowing */
            main header { flex-wrap: wrap; row-gap: 10px; }
            main header > div { flex-wrap: wrap; row-gap: 8px; }
            main header a, main header button { font-size: 12.5px !important; }
          }
          /* logo variant swap, BrandLogo renders both, CSS shows one */
          .cf-logo-dark { display: none !important; }
          :root[data-theme="dark"] .cf-logo-light { display: none !important; }
          :root[data-theme="dark"] .cf-logo-dark { display: inline-flex !important; }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
            /* reduced-motion users get the static poster, not the looping video */
            .cf-wallpaper-video { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  )
}
