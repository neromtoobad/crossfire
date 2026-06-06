export const metadata = {
  title: 'CROSSFIRE',
  description: 'Adversarial agents on a chain-enforced mandate.',
}

import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
