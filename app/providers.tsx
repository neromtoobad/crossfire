'use client'

// Providers. When MetaMask Embedded Wallets is enabled (a Web3Auth client ID is
// set), the app boots the Web3Auth provider stack — email/social login → an
// embedded smart account, plus MetaMask. Otherwise it uses the existing
// RainbowKit/wagmi stack (Base Sepolia + injected). Either way, every downstream
// wagmi hook works the same, so the mandate grant / bets / revoke are unchanged.
//
// initialState is hydrated from cookies by the server-side layout so we don't
// flash "Connect wallet" during the wagmi reconnect window (RainbowKit path).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { type State, WagmiProvider } from 'wagmi'
import { getConfig } from '../lib/wagmi-config.js'
import { W3A_ENABLED } from '../lib/web3auth'
import { Web3AuthProviders } from './web3auth-providers'

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: State
}) {
  if (W3A_ENABLED) return <Web3AuthProviders>{children}</Web3AuthProviders>
  return <WagmiProviders initialState={initialState}>{children}</WagmiProviders>
}

function WagmiProviders({
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
