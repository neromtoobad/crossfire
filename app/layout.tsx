import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'
import { Providers } from './providers'

export const metadata = {
  title: 'CROSSFIRE',
  description: 'Adversarial agents on a chain-enforced mandate.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read wallet connection state from cookies set by the wagmi cookieStorage.
  // This lets the SSR-rendered HTML already know the user is connected.
  const initialState = cookieToInitialState(getConfig(), (await headers()).get('cookie'))

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #060608; color: #ededf2; }
          body { font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif; }
          a { color: inherit; }
          button { font-family: inherit; }
        `}</style>
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  )
}
