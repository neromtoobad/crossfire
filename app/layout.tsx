import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'
import { Providers } from './providers'

export const metadata = {
  title: 'PUNDITS — five AI forecasters, one prediction-market league',
  description: 'Five AI forecasters with personalities compete to call prediction markets. Back the one you believe in with a few dollars of USDC — capped and enforced by the chain.',
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
            __html: `(function(){try{var t=localStorage.getItem('cf-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
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
            --cf-bg: #0B0C0F; --cf-surface: #161820; --cf-surface-2: #1C1F28; --cf-surface-3: #23262F;
            --cf-ink: #F3F3F0; --cf-ink-2: #ADADB6; --cf-ink-3: #80818A; --cf-ink-4: #5C5D66;
            --cf-line: #292A31; --cf-line-2: #3A3B43; --cf-line-dark: #F3F3F0;
            --cf-bull: #6AA0FF; --cf-bull-tint: #16233C; --cf-bull-ink: #BBD4FF;
            --cf-bear: #F4727A; --cf-bear-tint: #2E1619; --cf-bear-ink: #FECDD3;
            --cf-amber: #FBBF24; --cf-amber-tint: #2A2210; --cf-gold: #E3B341; --cf-gold-tint: #2A2410;
            --cf-positive: #4ADE80; --cf-positive-tint: #112A1B;
            --cf-shadow-card: 0 1px 2px rgba(0,0,0,0.55);
            --cf-shadow-hover: 0 6px 16px rgba(0,0,0,0.6);
            --cf-shadow-pop: 0 10px 30px rgba(0,0,0,0.66);
            --cf-noise: rgba(255,255,255,0.022);
            --cf-noise-opacity: 0.5;
            --cf-selection-bg: #F3F3F0; --cf-selection-fg: #0B0C0F;
            --cf-underline: rgba(243,243,240,0.3);
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
          /* logo variant swap — BrandLogo renders both, CSS shows one */
          .cf-logo-dark { display: none !important; }
          :root[data-theme="dark"] .cf-logo-light { display: none !important; }
          :root[data-theme="dark"] .cf-logo-dark { display: inline-flex !important; }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          }
        `}</style>
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  )
}
