/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The guide SDK pulls in Google auth + MCP deps; keep it out of the server
  // bundle and require it at runtime so the client bundle stays clean too.
  serverExternalPackages: ['@google/genai'],
  // Transpile scene (React/TSX). Content is consumed from its built dist so
  // Node fileURLToPath + readFileSync keep working (Turbopack rewrites import.meta.url).
  transpilePackages: [
    '@museum/scene',
    '@museum/portal-a1',
    '@museum/portal-b2',
    '@museum/portal-b3',
    '@museum/portal-b11',
    '@museum/portal-c1',
    '@museum/portal-c3',
    '@museum/portal-c10',
    '@museum/portal-d6',
    '@museum/portal-d7',
    '@museum/portal-f2',
    '@museum/portal-f7',
    '@museum/portal-f10'
  ]
}

export default nextConfig
