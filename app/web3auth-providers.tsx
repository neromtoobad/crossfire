'use client'

// MetaMask Embedded Wallets (Web3Auth v10) provider stack. Only rendered when
// NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is set (see app/providers.tsx). Web3Auth's own
// WagmiProvider builds the wagmi config from the Web3Auth config, so every
// downstream wagmi hook (useAccount, signTypedData for the ERC-7715 mandate,
// bets) keeps working, now backed by an embedded smart account.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'
import { W3A_CLIENT_ID } from '../lib/web3auth'

// Must MATCH the network of your Embedded Wallets dashboard project. Defaults to
// Sapphire Devnet (the free/dev tier); set NEXT_PUBLIC_WEB3AUTH_NETWORK=
// sapphire_mainnet once your project is on mainnet.
const W3A_NETWORK = (process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK as
  | (typeof WEB3AUTH_NETWORK)[keyof typeof WEB3AUTH_NETWORK]
  | undefined) ?? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET

const web3AuthContextConfig = {
  web3AuthOptions: {
    clientId: W3A_CLIENT_ID,
    web3AuthNetwork: W3A_NETWORK,
    // Chains (Base Sepolia + Base) are configured in the Embedded Wallets
    // dashboard project; the SDK reads them from there.
  },
}

export function Web3AuthProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    // @ts-expect-error - config typing varies across @web3auth/modal minors
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>{children}</WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  )
}
