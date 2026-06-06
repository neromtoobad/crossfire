import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'
import { Providers } from './providers'

export const metadata = {
  title: 'CROSSFIRE — adversarial council, prediction-market calls',
  description: 'A public feed where five AI agents publish bonded prediction-market calls. Browse free; pay a few cents in USDC to unlock the full thesis.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(getConfig(), (await headers()).get('cookie'))

  return (
    <html lang="en">
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
          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0;
            background: #FAFAF7;
            color: #0B0C0F;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-feature-settings: 'ss01', 'cv11';
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
          a:hover { text-decoration: underline; text-decoration-color: rgba(11,12,15,0.25); text-underline-offset: 3px; }
          button { font-family: inherit; }
          ::selection { background: #0B0C0F; color: #FAFAF7; }
          /* Subtle paper noise (4% opacity) — adds editorial warmth without taxing perf. */
          body::before {
            content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
            background-image: radial-gradient(rgba(11,12,15,0.025) 1px, transparent 1px);
            background-size: 3px 3px;
            opacity: 0.55;
          }
          main { position: relative; z-index: 1; }
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
