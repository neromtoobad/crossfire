'use client'

// Wagmi + react-query providers. Wraps all routes via app/layout.tsx.
// initialState is hydrated from cookies by the server-side layout so we
// don't show "Connect wallet" during the wagmi reconnect window.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { type State, WagmiProvider } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: State
}) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
