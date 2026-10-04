import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// BLUEPRINT section 11: the guide API key and the Gemini SDK must never reach
// the client bundle. Grep the static client output after `next build`.
const FORBIDDEN = ['GEMINI_API_KEY', 'ELEVENLABS_API_KEY', 'GoogleGenAI']

const staticDir = fileURLToPath(new URL('../.next/static', import.meta.url))

function walkJs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walkJs(path, out)
    else if (entry.name.endsWith('.js')) out.push(path)
  }
  return out
}

const offenders = []
for (const file of walkJs(staticDir)) {
  const content = readFileSync(file, 'utf8')
  for (const needle of FORBIDDEN) {
    if (content.includes(needle)) offenders.push(`${needle} in ${file}`)
  }
}

if (offenders.length > 0) {
  console.error('Server-only secrets or SDK leaked into the client bundle:')
  for (const line of offenders) console.error('  ' + line)
  process.exit(1)
}

console.log('No server-only keys or SDK in the client bundle.')
