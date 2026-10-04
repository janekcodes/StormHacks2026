import * as THREE from 'three'
import { onTextureSet, TEXTURE_METRES, type TextureKey } from './textures'

/**
 * The heritage material palette (decision 0012). One cached instance is shared
 * by the building, furniture and exhibit stands, so it is never disposed by a
 * component. Textured materials start as a flat colour close to the texture's
 * average tone and switch to the PBR maps when `streamTextures` delivers them.
 */
export interface MuseumMaterials {
  plaster: THREE.MeshStandardMaterial
  ceiling: THREE.MeshStandardMaterial
  trim: THREE.MeshStandardMaterial
  panel: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  stone: THREE.MeshStandardMaterial
  marble: THREE.MeshStandardMaterial
  parquet: THREE.MeshStandardMaterial
  /** Untextured honed limestone for plinths and daises. */
  limestone: THREE.MeshStandardMaterial
  /** Untextured polished marble for plinth tops (a tiled texture would show seams). */
  polished: THREE.MeshStandardMaterial
  brass: THREE.MeshStandardMaterial
  bronze: THREE.MeshStandardMaterial
  glass: THREE.MeshPhysicalMaterial
  leather: THREE.MeshStandardMaterial
  velvet: THREE.MeshStandardMaterial
  frieze: THREE.MeshStandardMaterial
  caseLight: THREE.MeshStandardMaterial
  downlight: THREE.MeshStandardMaterial
  pot: THREE.MeshStandardMaterial
  soil: THREE.MeshStandardMaterial
  leaf: THREE.MeshStandardMaterial
  trunk: THREE.MeshStandardMaterial
  ground: THREE.MeshStandardMaterial
  paving: THREE.MeshStandardMaterial
  merch: THREE.MeshStandardMaterial
}

interface TexturedSpec {
  tex: TextureKey
  /** Colour before textures load (texture average). */
  fallback: number
  /** Multiplier once the albedo map is applied. */
  tint: number
  roughness: number
  normalScale?: number
  envMapIntensity?: number
  /** Ignore the set's roughness map and keep `roughness` flat (e.g. a satin floor finish). */
  flatRoughness?: boolean
}

function textured(spec: TexturedSpec): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: spec.fallback,
    roughness: spec.roughness,
    metalness: 0,
    envMapIntensity: spec.envMapIntensity ?? 1
  })
  m.userData.tex = spec.tex
  m.userData.tint = spec.tint
  m.userData.normalScale = spec.normalScale ?? 1
  m.userData.uvMetres = TEXTURE_METRES[spec.tex]
  m.userData.flatRoughness = spec.flatRoughness ?? false
  return m
}

let cache: MuseumMaterials | null = null

export function museumMaterials(): MuseumMaterials {
  if (cache) return cache
  const mats: MuseumMaterials = {
    plaster: textured({ tex: 'plaster', fallback: 0xe4dac8, tint: 0xfffaf0, roughness: 1, normalScale: 0.6 }),
    ceiling: textured({ tex: 'plaster', fallback: 0xece5d8, tint: 0xffffff, roughness: 1, normalScale: 0.4 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xf1ebdf, roughness: 0.55 }),
    panel: textured({ tex: 'panel', fallback: 0x4a2a1c, tint: 0xb08068, roughness: 0.75 }),
    wood: textured({ tex: 'wood', fallback: 0x3a2117, tint: 0xd8b8a4, roughness: 0.8 }),
    stone: textured({ tex: 'stone', fallback: 0xd8cbb2, tint: 0xf4ece0, roughness: 0.9 }),
    marble: textured({
      tex: 'stone',
      fallback: 0xe2d6c0,
      tint: 0xfbf4e8,
      roughness: 0.38,
      envMapIntensity: 1.25
    }),
    parquet: textured({
      tex: 'parquet',
      fallback: 0x9a6c40,
      tint: 0xd9c2a6,
      roughness: 0.62,
      flatRoughness: true,
      envMapIntensity: 0.7
    }),
    limestone: new THREE.MeshStandardMaterial({ color: 0xd6ccb9, roughness: 0.78 }),
    polished: new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.2, envMapIntensity: 1.2 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc19a5b, roughness: 0.3, metalness: 1 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x3d3026, roughness: 0.42, metalness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xeef4f2,
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      envMapIntensity: 1.8,
      specularIntensity: 1,
      depthWrite: false
    }),
    leather: textured({ tex: 'leather', fallback: 0x4f2c1c, tint: 0xc89a80, roughness: 0.9 }),
    velvet: textured({ tex: 'velvet', fallback: 0x5e1a1f, tint: 0xa8585c, roughness: 1, normalScale: 0.5 }),
    frieze: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, vertexColors: true }),
    caseLight: new THREE.MeshStandardMaterial({
      color: 0xfff1d6,
      emissive: 0xffd9a0,
      emissiveIntensity: 2.4,
      roughness: 0.5
    }),
    downlight: new THREE.MeshStandardMaterial({
      color: 0xfff6e6,
      emissive: 0xfff0d6,
      emissiveIntensity: 1.6,
      roughness: 0.4
    }),
    pot: textured({ tex: 'stone', fallback: 0xcfc3ac, tint: 0xe8ddca, roughness: 0.8 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x2c2118, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({
      color: 0x4f7a43,
      roughness: 0.7,
      side: THREE.DoubleSide
    }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.95 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x7d8466, roughness: 1 }),
    paving: textured({ tex: 'stone', fallback: 0xb7ad9c, tint: 0xc9c0b0, roughness: 1 }),
    merch: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, vertexColors: true })
  }
  // Uplight bounce: the coffered ceiling would otherwise read as a dark lid.
  mats.ceiling.emissive.set(0x3a342b)
  mats.trim.emissive.set(0x26221c)
  cache = mats

  onTextureSet((key, set) => {
    for (const m of Object.values(mats) as THREE.Material[]) {
      if (!(m instanceof THREE.MeshStandardMaterial) || m.userData.tex !== key) continue
      m.map = set.albedo
      m.normalMap = set.normal
      const ns = m.userData.normalScale as number
      m.normalScale.set(ns, ns)
      if (!m.userData.flatRoughness) m.roughnessMap = set.orm
      m.aoMap = set.orm
      m.color.set(m.userData.tint as number)
      m.needsUpdate = true
    }
  })
  return mats
}

/** Metres per texture tile for a material, if it is textured. */
export function uvMetresOf(material: THREE.Material): number | undefined {
  const v = material.userData.uvMetres as unknown
  return typeof v === 'number' ? v : undefined
}

export function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts?: { repeat?: [number, number]; linear?: boolean }
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) throw new Error('2d context unavailable')
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = opts?.linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
  t.anisotropy = 8
  if (opts?.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(opts.repeat[0], opts.repeat[1])
  }
  return t
}

export function wrapText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number
): number {
  const words = text.split(' ')
  let line = ''
  let cy = y
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, cy)
      cy += lh
      line = w
    } else {
      line = t
    }
  }
  if (line) g.fillText(line, x, cy)
  return cy
}

export type FontRole = 'display' | 'body' | 'screen'

const FONT_FALLBACK: Record<FontRole, string> = {
  display: '"Chakra Petch", sans-serif',
  body: '"IBM Plex Mono", monospace',
  screen: 'VT323, monospace'
}

/** Canvas font family for a role, read from the `--font-*` variables set by `next/font`. */
export function fontFamily(role: FontRole): string {
  if (typeof document === 'undefined') return FONT_FALLBACK[role]
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--font-${role}`).trim()
  return v || FONT_FALLBACK[role]
}

/** Resolves once the museum web fonts can be used by canvas drawing (never rejects). */
export function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  const loads = [
    `700 48px ${fontFamily('display')}`,
    `600 48px ${fontFamily('display')}`,
    `500 24px ${fontFamily('body')}`,
    `600 24px ${fontFamily('body')}`
  ].map((spec) => document.fonts.load(spec).catch(() => []))
  return Promise.all(loads).then(() => undefined)
}

/** Shape in XY that maps to world XZ after rotateX(-PI/2) when using negated Z. */
export function outlineShape(
  pts: readonly (readonly [number, number])[],
  negateZ: boolean
): THREE.Shape {
  const s = new THREE.Shape()
  pts.forEach((p, i) => {
    const zz = negateZ ? -p[1] : p[1]
    if (i === 0) s.moveTo(p[0], zz)
    else s.lineTo(p[0], zz)
  })
  s.closePath()
  return s
}
