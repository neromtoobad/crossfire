// MetaMask Embedded Wallets (Web3Auth v10), feature flag.
//
// Activates ONLY when NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is set. Otherwise the app
// falls back to the existing RainbowKit / MetaMask flow, unchanged, so the
// working demo can never break.
//
// To enable: get a free Client ID at https://dashboard.web3auth.io (create a
// project, add Base Sepolia + Base as chains), then set in .env.local:
//   NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=<your client id>
//
// This file deliberately imports NO SDK code, so it stays out of every bundle.

export const W3A_CLIENT_ID = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? ''
export const W3A_ENABLED = W3A_CLIENT_ID.length > 0
