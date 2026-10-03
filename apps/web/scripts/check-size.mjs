import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// BLUEPRINT section 10 performance budget: initial load before exhibit assets < 3 MB.
const LIMIT_BYTES = 3 * 1024 * 1024

function totalBytes(dir) {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += totalBytes(path)
    } else {
      total += statSync(path).size
    }
  }
  return total
}

const staticDir = fileURLToPath(new URL('../.next/static', import.meta.url))
const bytes = totalBytes(staticDir)
const mb = (bytes / 1024 / 1024).toFixed(2)
const budgetMb = (LIMIT_BYTES / 1024 / 1024).toFixed(0)

console.log(`Initial static payload: ${mb} MB (budget ${budgetMb} MB)`)

if (bytes > LIMIT_BYTES) {
  console.error(`Exceeds the BLUEPRINT initial-load budget of ${budgetMb} MB.`)
  process.exit(1)
}
