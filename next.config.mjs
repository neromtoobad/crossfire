/** @type {import('next').NextConfig} */
const nextConfig = {
  // server-only env passthrough (Venice/1Shot keys must NOT reach the client)
  serverRuntimeConfig: {},
}

export default nextConfig
