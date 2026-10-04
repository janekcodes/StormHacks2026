import { readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// BLUEPRINT section 10 performance budget: initial load before exhibit assets < 3 MB.
const LIMIT_BYTES = 3 * 1024 * 1024

const nextDir = fileURLToPath(new URL('../.next', import.meta.url))
const buildManifestPath = join(nextDir, 'build-manifest.json')

/**
 * "Initial load" is the JS every route downloads on first paint: the polyfill
 * plus the shared root (main-app) chunks listed in `build-manifest.json`.
 * Lazy chunks (the 3D scene with Recast + three.js, and the per-exhibit portal
 * packages, which are "exhibit assets") are intentionally excluded, matching
 * the BLUEPRINT wording "before exhibit assets".
 */
function fileBytes(rel) {
  const abs = join(nextDir, rel)
  if (!existsSync(abs)) {
    throw new Error(`Initial chunk missing from build output: ${rel}`)
  }
  return statSync(abs).size
}

function totalBytes(files) {
  return files.reduce((sum, rel) => sum + fileBytes(rel), 0)
}

const manifest = JSON.parse(readFileSync(buildManifestPath, 'utf8'))
const initialJsFiles = [...(manifest.polyfillFiles ?? []), ...(manifest.rootMainFiles ?? [])]
const bytes = totalBytes(initialJsFiles)

const mb = (bytes / 1024 / 1024).toFixed(2)
const budgetMb = (LIMIT_BYTES / 1024 / 1024).toFixed(0)

console.log(`Initial shared JS payload: ${mb} MB (budget ${budgetMb} MB)`)

if (bytes > LIMIT_BYTES) {
  console.error(`Exceeds the BLUEPRINT initial-load budget of ${budgetMb} MB.`)
  process.exit(1)
}
