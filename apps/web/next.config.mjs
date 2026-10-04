/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile scene (React/TSX). Content is consumed from its built dist so
  // Node fileURLToPath + readFileSync keep working (Turbopack rewrites import.meta.url).
  transpilePackages: ['@museum/scene']
}

export default nextConfig
