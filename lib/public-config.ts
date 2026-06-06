// Public addresses + chain config safe to import in client components.
// These are NOT secret — they're our deployed service account addresses
// and well-known token contracts.

export const PUBLIC = {
  chainId: 84532, // Base Sepolia
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,

  // The orchestrator service EOA — users sign delegations TO this address.
  // The server (with ORCHESTRATOR_PRIVATE_KEY in env) acts on their behalf.
  ORCHESTRATOR: '0x58a17A308431e7C56A92Df78cEeBeB6a99D5301f' as `0x${string}`,
} as const

export const MANDATE_LIMITS = {
  minCapUsdc: 1,
  maxCapUsdc: 50,
  defaultCapUsdc: 20,
  defaultExpiryHours: 24,
  expiryChoices: [
    { label: '1 hour', hours: 1 },
    { label: '6 hours', hours: 6 },
    { label: '24 hours', hours: 24 },
  ],
} as const
