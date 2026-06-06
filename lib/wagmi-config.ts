// Wagmi config — Base Sepolia + injected (MetaMask) connector.
// Uses cookieStorage so the server can hydrate the connected state on
// initial render; without this, every SSR'd page shows "Connect wallet"
// for the ~1-second gap while wagmi reconciles localStorage on the client.

import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export function getConfig() {
  return createConfig({
    chains: [baseSepolia, base],
    connectors: [
      // MetaMask first — the demo target. injected() catches Rabby, Brave, etc.
      metaMask(),
      injected(),
    ],
    storage: createStorage({ storage: cookieStorage }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http('https://sepolia.base.org'),
      [base.id]: http('https://mainnet.base.org'),
    },
  })
}

// Re-export a default singleton for client-side imports (components that
// don't need to instantiate per-request).
export const wagmiConfig = getConfig()

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
