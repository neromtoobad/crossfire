import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'
import { Providers } from './providers'

export const metadata = {
  title: 'CROSSFIRE — five AI pundits call the World Cup',
  description: 'Five AI football pundits call the 2026 World Cup and stake real, chain-capped USDC on every match. Follow the ones you trust, fade the ones you don\'t. The winning side splits the pot.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(getConfig(), (await headers()).get('cookie'))

  return (
    <html lang="en" suppressHydrationWarning>
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
        {/* No-flash theme: set data-theme before first paint from saved choice
            or the OS preference, so dark never flashes light on load. */}
        <script
          dangerouslySetInnerHTML={{
            // The arena is a committed dark design — force dark everywhere and
            // clear any stale light preference so the landing and inner pages
            // never diverge.
            __html: `(function(){try{localStorage.removeItem('cf-theme');}catch(e){}document.documentElement.setAttribute('data-theme','dark');})();`,
          }}
        />
        <style>{`
          /* ── theme variables ─────────────────────────────────────────── */
          :root, :root[data-theme="light"] {
            --cf-bg: #FAFAF7; --cf-surface: #FFFFFF; --cf-surface-2: #F4F4EE; --cf-surface-3: #EDEBE3;
            --cf-ink: #0B0C0F; --cf-ink-2: #52525B; --cf-ink-3: #8B8B92; --cf-ink-4: #A1A1AA;
            --cf-line: #E7E5E0; --cf-line-2: #D4D4CE; --cf-line-dark: #0B0C0F;
            --cf-bull: #1D4ED8; --cf-bull-tint: #EFF4FF; --cf-bull-ink: #1E3A8A;
            --cf-bear: #B91C1C; --cf-bear-tint: #FEF2F2; --cf-bear-ink: #7F1D1D;
            --cf-amber: #B45309; --cf-amber-tint: #FEF3C7; --cf-gold: #A16207; --cf-gold-tint: #FEF7E0;
            --cf-positive: #15803D; --cf-positive-tint: #ECFDF5;
            --cf-shadow-card: 0 1px 2px rgba(11,12,15,0.04);
            --cf-shadow-hover: 0 4px 12px rgba(11,12,15,0.06);
            --cf-shadow-pop: 0 6px 24px rgba(11,12,15,0.08);
            --cf-noise: rgba(11,12,15,0.025);
            --cf-noise-opacity: 0.55;
            --cf-selection-bg: #0B0C0F; --cf-selection-fg: #FAFAF7;
            --cf-underline: rgba(11,12,15,0.25);
            color-scheme: light;
          }
          :root[data-theme="dark"] {
            /* arena broadcast-gold — matches lib/arena.ts so the whole app reads
               like the Live World Cup Arena landing */
            --cf-bg: #03070C; --cf-surface: #0B121B; --cf-surface-2: #0F1822; --cf-surface-3: #141E2A;
            --cf-ink: #F0E9D7; --cf-ink-2: #CFC9BB; --cf-ink-3: #8E8979; --cf-ink-4: #5F5B4E;
            --cf-line: #1A2430; --cf-line-2: #2A3645; --cf-line-dark: #E8C254;
            --cf-bull: #5B8DEF; --cf-bull-tint: #16233C; --cf-bull-ink: #BBD4FF;
            --cf-bear: #F05A5A; --cf-bear-tint: #2E1619; --cf-bear-ink: #FECDD3;
            --cf-amber: #E8C254; --cf-amber-tint: #2A2210; --cf-gold: #E8C254; --cf-gold-tint: #2A2410;
            --cf-positive: #2BD46E; --cf-positive-tint: #0C2A1E;
            --cf-shadow-card: 0 1px 2px rgba(0,0,0,0.6);
            --cf-shadow-hover: 0 8px 22px rgba(0,0,0,0.65);
            --cf-shadow-pop: 0 12px 34px rgba(0,0,0,0.7);
            --cf-noise: rgba(232,194,84,0.018);
            --cf-noise-opacity: 0.5;
            --cf-selection-bg: #E8C254; --cf-selection-fg: #03070C;
            --cf-underline: rgba(232,194,84,0.35);
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
          html { transition: background-color 0.25s ease; }
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
          /* Subtle paper noise — adds editorial warmth without taxing perf. */
          body::before {
            content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
            background-image: radial-gradient(var(--cf-noise) 1px, transparent 1px);
            background-size: 3px 3px;
            opacity: var(--cf-noise-opacity);
          }
          main { position: relative; z-index: 1; }
          /* feed cards lift on hover — a little life for the betting feed */
          .cf-card:hover { transform: translateY(-2px); box-shadow: var(--cf-shadow-hover); border-color: var(--cf-line-2); }
          /* ── motion toolkit ── */
          @keyframes cf-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.82); } }
          @keyframes cf-rise { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes cf-blink { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
          .cf-live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; background: #DC2626; animation: cf-pulse 1.5s ease-in-out infinite; }
          .cf-rise { animation: cf-rise 0.34s cubic-bezier(0.22,1,0.36,1) both; }
          .cf-think span { animation: cf-blink 1.1s infinite; }
          .cf-think span:nth-child(2) { animation-delay: 0.18s; }
          .cf-think span:nth-child(3) { animation-delay: 0.36s; }
          /* logo variant swap — BrandLogo renders both, CSS shows one */
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
