import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/**
 * Downloads the CC0 Poly Haven texture sets used by the museum shell
 * (decision 0012) and packs each into albedo, normal (OpenGL) and ORM
 * (occlusion, roughness, metalness) WebP maps at 1024 and 512 px.
 *
 * Run with `pnpm --filter @museum/assets textures`.
 */

interface TextureSet {
  /** File prefix used by `packages/scene/src/building/textures.ts`. */
  key: string
  /** Poly Haven asset id. */
  id: string
}

export const TEXTURE_SETS: readonly TextureSet[] = [
  { key: 'stone', id: 'marble_01' },
  { key: 'parquet', id: 'herringbone_parquet' },
  { key: 'panel', id: 'wooden_panels' },
  { key: 'wood', id: 'lacquered_cherry_wood' },
  { key: 'plaster', id: 'painted_plaster_wall' },
  { key: 'leather', id: 'brown_leather' },
  { key: 'velvet', id: 'velour_velvet' }
]

const SIZES = [1024, 512] as const
const API = 'https://api.polyhaven.com'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const outDir = join(root, 'apps', 'web', 'public', 'textures')

type FileTree = Record<string, Record<string, Record<string, { url: string }>>>

interface AssetInfo {
  name: string
  authors: Record<string, string>
  dimensions?: number[]
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return (await res.json()) as T
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function pick(files: FileTree, map: string): string {
  const res = files[map]?.['1k']
  const entry = res?.['jpg'] ?? res?.['png']
  if (!entry) throw new Error(`missing 1k ${map}`)
  return entry.url
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true })
  const credits: string[] = [
    '# Texture credits',
    '',
    'All textures are CC0 (public domain) from [Poly Haven](https://polyhaven.com). Packed by `tools/assets/src/textures.ts` (decision 0012).',
    '',
    '| Key | Asset | Authors | Real size (m) |',
    '|---|---|---|---|'
  ]
  let total = 0

  for (const set of TEXTURE_SETS) {
    const [files, info] = await Promise.all([
      json<FileTree>(`${API}/files/${set.id}`),
      json<AssetInfo>(`${API}/info/${set.id}`)
    ])
    const sources = {
      albedo: await download(pick(files, 'Diffuse')),
      normal: await download(pick(files, 'nor_gl')),
      orm: await download(pick(files, 'arm'))
    }
    for (const size of SIZES) {
      for (const [map, buf] of Object.entries(sources)) {
        const out = join(outDir, `${set.key}-${map}-${size}.webp`)
        const quality = map === 'normal' ? 90 : 82
        const info = await sharp(buf)
          .resize(size, size, { fit: 'fill' })
          .webp({ quality, effort: 6 })
          .toFile(out)
        total += info.size
      }
    }
    const metres = info.dimensions?.[0] ? (info.dimensions[0] / 1000).toFixed(2) : '?'
    credits.push(
      `| ${set.key} | [${info.name}](https://polyhaven.com/a/${set.id}) | ${Object.keys(info.authors).join(', ')} | ${metres} |`
    )
    console.log(`packed ${set.key} (${set.id})`)
  }

  writeFileSync(join(outDir, 'CREDITS.md'), `${credits.join('\n')}\n`)
  console.log(`textures written to ${outDir} (${(total / 1024).toFixed(0)} KB)`)
}

void main()
