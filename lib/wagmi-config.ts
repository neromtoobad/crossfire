// Wagmi config — Base Sepolia + injected (MetaMask) connector.
// No WalletConnect projectId on purpose: the demo target is the MetaMask
// browser extension specifically, and that's what the tracks score against.

import { http, createConfig } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    // Order matters — RainbowKit / wagmi pick the first injected by default.
    metaMask(),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'),
  },
  ssr: true, // Next.js App Router
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
