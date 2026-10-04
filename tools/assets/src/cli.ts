import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { optimizeGlb } from './optimize'

// tools/assets/src/cli.ts -> repo root
const root = fileURLToPath(new URL('../../..', import.meta.url))

const sourceDir = join(root, 'assets', 'out')
const targetDir = join(root, 'apps', 'web', 'public', 'models')

async function main(): Promise<void> {
  if (!existsSync(sourceDir)) {
    console.log(`no assets to build (${sourceDir} does not exist yet)`)
    return
  }

  const files = readdirSync(sourceDir)
    .filter((name) => name.endsWith('.glb'))
    .sort()

  if (files.length === 0) {
    console.log(`no assets to build (${sourceDir} is empty)`)
    return
  }

  mkdirSync(targetDir, { recursive: true })

  let failed = false
  for (const file of files) {
    const id = file.slice(0, -4).toUpperCase()
    const source = join(sourceDir, file)
    const target = join(targetDir, `${id}.glb`)
    try {
      const result = await optimizeGlb(id, source, target)
      console.log(`optimised ${id} -> ${target} (${result.triangles} tris, ${result.bytes} bytes)`)
    } catch (error) {
      failed = true
      console.error(error instanceof Error ? error.message : String(error))
    }
  }

  if (failed) {
    console.error('assets:build failed: one or more models are over budget')
    process.exitCode = 1
  }
}

void main()
