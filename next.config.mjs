import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next/Turbopack uses THIS project's public/ dir
  // (otherwise it can pick up a stray lockfile from a parent directory).
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
