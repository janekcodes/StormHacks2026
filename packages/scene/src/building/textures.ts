import * as THREE from 'three'

/** Texture sets packed by `tools/assets/src/textures.ts` into `public/textures`. */
export type TextureKey = 'stone' | 'parquet' | 'panel' | 'wood' | 'plaster' | 'leather' | 'velvet'

/**
 * Real-world size in metres of one texture tile (Poly Haven `dimensions`).
 * Geometry UVs are written in metres divided by this, so every surface tiles
 * at true scale regardless of mesh size.
 */
export const TEXTURE_METRES: Record<TextureKey, number> = {
  stone: 1.5,
  parquet: 3.4,
  panel: 2.1,
  wood: 1,
  plaster: 2,
  leather: 0.4,
  velvet: 0.28
}

export interface TextureSet {
  albedo: THREE.Texture
  normal: THREE.Texture
  orm: THREE.Texture
}

type Listener = (key: TextureKey, set: TextureSet) => void

const loaded = new Map<TextureKey, TextureSet>()
const listeners = new Set<Listener>()
let started: number | null = null

/** Called once per texture set as it arrives (immediately for sets already loaded). */
export function onTextureSet(listener: Listener): () => void {
  for (const [key, set] of loaded) listener(key, set)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function loadOne(loader: THREE.TextureLoader, url: string, srgb: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
        tex.anisotropy = 8
        resolve(tex)
      },
      undefined,
      reject
    )
  })
}

/**
 * Streams the PBR sets after the first frame. `low` keeps the flat colours,
 * `balanced` uses 512 px maps and `high` 1024 px (decision 0012).
 */
export function streamTextures(size: 0 | 512 | 1024): void {
  if (size === 0 || started !== null) return
  started = size
  const loader = new THREE.TextureLoader()
  const keys = Object.keys(TEXTURE_METRES) as TextureKey[]
  for (const key of keys) {
    if (loaded.has(key)) continue
    const base = `/textures/${key}`
    void Promise.all([
      loadOne(loader, `${base}-albedo-${size}.webp`, true),
      loadOne(loader, `${base}-normal-${size}.webp`, false),
      loadOne(loader, `${base}-orm-${size}.webp`, false)
    ])
      .then(([albedo, normal, orm]) => {
        const set = { albedo, normal, orm }
        loaded.set(key, set)
        for (const listener of listeners) listener(key, set)
      })
      .catch(() => {
        // Missing textures keep the flat fallback colour.
      })
  }
}

/** Rewrites the uv attribute so one texture tile spans `metres` in world space. */
export function worldUv(geo: THREE.BufferGeometry, metres: number): void {
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  if (!pos || !nor) return
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i))
    const ny = Math.abs(nor.getY(i))
    const nz = Math.abs(nor.getZ(i))
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    let u: number
    let v: number
    if (ny >= nx && ny >= nz) {
      u = x
      v = z
    } else if (nx >= nz) {
      u = z
      v = y
    } else {
      u = x
      v = y
    }
    uv[i * 2] = u / metres
    uv[i * 2 + 1] = v / metres
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

/** Scales an existing uv attribute that is already in metres (e.g. ShapeGeometry). */
export function scaleUv(geo: THREE.BufferGeometry, metres: number, rotate = 0): void {
  const uv = geo.getAttribute('uv')
  if (!uv) return
  const c = Math.cos(rotate)
  const s = Math.sin(rotate)
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    uv.setXY(i, (u * c - v * s) / metres, (u * s + v * c) / metres)
  }
  uv.needsUpdate = true
}
