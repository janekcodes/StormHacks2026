import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Plan 16 programmatic GLB generator.
 *
 * Composes a recognizable low-poly object per Core + Extended exhibit from
 * three.js primitives, merges each object to at most two meshes (one base, one
 * emissive accent) so the runtime draw-call budget is met, and exports
 * `assets/out/<ID>.glb`. `pnpm assets:build` then optimizes each into
 * `apps/web/public/models/<ID>.glb`.
 *
 * Objects are authored with their base at y = 0, sized for a 0.9 m plinth
 * (about 0.5 m tall) or standing on the floor (racks/towers, up to about 1.9 m).
 */

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// ---- primitives ------------------------------------------------------------

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

function cyl(rt: number, rb: number, h: number, x = 0, y = 0, z = 0, segments = 20): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, segments)
  g.translate(x, y, z)
  return g
}

function sphere(r: number, x = 0, y = 0, z = 0, ws = 16, hs = 12): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(r, ws, hs)
  g.translate(x, y, z)
  return g
}

function torus(r: number, tube: number, x = 0, y = 0, z = 0, radial = 8, tubular = 24): THREE.TorusGeometry {
  const g = new THREE.TorusGeometry(r, tube, radial, tubular)
  g.translate(x, y, z)
  return g
}

function gear(r: number, thickness: number, teeth: number, x = 0, y = 0, z = 0): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [cyl(r - 0.06, r - 0.06, thickness, x, y, z, 32)]
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    parts.push(
      box(
        0.07,
        thickness + 0.02,
        0.07,
        x + Math.cos(a) * r,
        y,
        z + Math.sin(a) * r
      )
    )
  }
  return parts
}

// ---- kits ------------------------------------------------------------------

type Parts = { base: THREE.BufferGeometry[]; accent: THREE.BufferGeometry[] }

function kitGears(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(...gear(0.28 * scale, 0.08 * scale, 10, -0.14 * scale, 0.2 * scale, 0))
  base.push(...gear(0.18 * scale, 0.08 * scale, 8, 0.14 * scale, 0.12 * scale, 0))
  base.push(box(0.62 * scale, 0.04 * scale, 0.62 * scale, 0, 0.02 * scale, 0))
  return { base, accent: [] }
}

function kitBook(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  const w = 0.4 * scale
  const t = 0.05 * scale
  const h = 0.56 * scale
  base.push(box(w, t, h, -w / 2, 0.02 * scale, 0))
  // two open leaves angled upward
  base.push(box(w / 2, t, h, -w / 2, t + 0.08 * scale, 0))
  base.push(box(w / 2, t, h, w / 2, t + 0.08 * scale, 0))
  base[base.length - 1]!.rotateX(0.15)
  base[base.length - 2]!.rotateX(-0.15)
  // spine
  base.push(box(0.05 * scale, t, h, 0, 0.05 * scale, 0))
  return { base, accent: [] }
}

function kitCards(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  const w = 0.4 * scale
  const t = 0.012 * scale
  const d = 0.18 * scale
  for (let i = 0; i < 6; i++) {
    base.push(box(w, t, d, 0, 0.02 * scale + i * t * 1.2, 0))
  }
  return { base, accent: [] }
}

function kitTubes(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(box(0.6 * scale, 0.06 * scale, 0.4 * scale, 0, 0.03 * scale, 0))
  const accent: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.11 * scale
    base.push(cyl(0.035 * scale, 0.035 * scale, 0.42 * scale, x, 0.27 * scale, 0, 12))
    accent.push(cyl(0.03 * scale, 0.03 * scale, 0.18 * scale, x, 0.18 * scale, 0, 12))
  }
  return { base, accent }
}

function kitChip(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  const w = 0.6 * scale
  const t = 0.03 * scale
  base.push(box(w, t, w, 0, t / 2, 0))
  base.push(box(0.3 * scale, 0.06 * scale, 0.3 * scale, 0, t + 0.03 * scale, 0))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    base.push(box(0.05 * scale, 0.05 * scale, 0.05 * scale, Math.cos(a) * w * 0.4, 0.06 * scale, Math.sin(a) * w * 0.4))
  }
  return { base, accent: [box(0.2 * scale, 0.02 * scale, 0.2 * scale, 0, t + 0.06 * scale, 0)] }
}

function kitRack(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  const h = 1.8 * scale
  base.push(box(0.7 * scale, h, 0.5 * scale, 0, h / 2, 0))
  for (let i = 0; i < 4; i++) {
    base.push(box(0.56 * scale, 0.1 * scale, 0.34 * scale, 0, 0.35 * scale + i * 0.32 * scale, 0.06 * scale))
  }
  return { base, accent: [] }
}

function kitGlobe(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(sphere(0.3 * scale, 0, 0.32 * scale, 0))
  base.push(box(0.1 * scale, 0.02 * scale, 0.1 * scale, 0, 0.02 * scale, 0))
  return { base, accent: [torus(0.42 * scale, 0.02 * scale, 0, 0.32 * scale, 0)] }
}

function kitScreen(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(box(0.6 * scale, 0.4 * scale, 0.06 * scale, 0, 0.34 * scale, 0))
  base.push(box(0.1 * scale, 0.1 * scale, 0.1 * scale, 0, 0.06 * scale, 0))
  return { base, accent: [box(0.52 * scale, 0.32 * scale, 0.01 * scale, 0, 0.34 * scale, 0.04 * scale)] }
}

function kitNeural(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  const accent: THREE.BufferGeometry[] = []
  // [x offset, node count] per layer (a small feed-forward net)
  const layers: [number, number][] = [
    [-0.2 * scale, 3],
    [0, 5],
    [0.2 * scale, 3]
  ]
  const prev: number[] = []
  layers.forEach(([lx, count], li) => {
    const ys: number[] = []
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * 0.12 * scale + 0.3 * scale
      ys.push(y)
      accent.push(sphere(0.05 * scale, lx, y, 0, 10, 8))
    }
    if (li > 0) {
      for (const py of prev) {
        for (const cy of ys) {
          base.push(edgeCyl(py, cy, lx - 0.2 * scale, lx))
        }
      }
    }
    prev.length = 0
    prev.push(...ys)
  })
  return { base, accent }
}

function edgeCyl(y0: number, y1: number, x0: number, x1: number): THREE.CylinderGeometry {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const g = new THREE.CylinderGeometry(0.012, 0.012, len, 6)
  g.translate(x0 + dx / 2, y0 + dy / 2, 0)
  g.rotateZ(Math.atan2(dy, dx))
  return g
}

function kitPortrait(scale: number, count: number): Parts {
  const base: THREE.BufferGeometry[] = []
  const heads: number[] = count === 1 ? [0] : [-0.14 * scale, 0, 0.14 * scale]
  for (const hx of heads) {
    base.push(sphere(0.12 * scale, hx, 0.28 * scale, 0, 16, 12))
    base.push(cyl(0.04 * scale, 0.05 * scale, 0.08 * scale, hx, 0.14 * scale, 0, 12))
  }
  base.push(box(0.7 * scale, 0.05 * scale, 0.3 * scale, 0, 0.025 * scale, 0))
  return { base, accent: [] }
}

function kitCrate(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(box(0.5 * scale, 0.28 * scale, 0.4 * scale, 0, 0.14 * scale, 0))
  base.push(box(0.4 * scale, 0.24 * scale, 0.34 * scale, 0, 0.42 * scale, 0))
  base.push(box(0.06 * scale, 0.06 * scale, 0.06 * scale, 0, 0.02 * scale, 0))
  return { base, accent: [] }
}

function kitDial(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(box(0.55 * scale, 0.4 * scale, 0.12 * scale, 0, 0.24 * scale, 0))
  base.push(cyl(0.12 * scale, 0.12 * scale, 0.05 * scale, 0, 0.3 * scale, 0.08 * scale, 24))
  for (const dx of [-0.14 * scale, 0.14 * scale]) {
    base.push(box(0.05 * scale, 0.05 * scale, 0.02 * scale, dx, 0.1 * scale, 0.08 * scale))
  }
  return { base, accent: [cyl(0.1 * scale, 0.1 * scale, 0.02 * scale, 0, 0.3 * scale, 0.1 * scale, 24)] }
}

function kitScale(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(cyl(0.03 * scale, 0.03 * scale, 0.6 * scale, 0, 0.3 * scale, 0, 10))
  base.push(box(0.6 * scale, 0.03 * scale, 0.04 * scale, 0, 0.56 * scale, 0))
  base.push(cyl(0.08 * scale, 0.08 * scale, 0.03 * scale, -0.26 * scale, 0.45 * scale, 0, 16))
  base.push(cyl(0.08 * scale, 0.08 * scale, 0.03 * scale, 0.26 * scale, 0.45 * scale, 0, 16))
  base.push(box(0.1 * scale, 0.02 * scale, 0.1 * scale, 0, 0.02 * scale, 0))
  return { base, accent: [] }
}

function kitQuantum(scale: number): Parts {
  const base: THREE.BufferGeometry[] = []
  base.push(sphere(0.12 * scale, 0, 0.2 * scale, 0, 16, 12))
  base.push(cyl(0.02 * scale, 0.02 * scale, 0.4 * scale, 0, 0.2 * scale, 0, 8))
  return {
    base,
    accent: [
      torus(0.18 * scale, 0.02 * scale, 0, 0.2 * scale, 0),
      torus(0.3 * scale, 0.02 * scale, 0, 0.36 * scale, 0),
      torus(0.44 * scale, 0.02 * scale, 0, 0.52 * scale, 0)
    ]
  }
}

type KitName =
  | 'gears'
  | 'book'
  | 'cards'
  | 'tubes'
  | 'chip'
  | 'rack'
  | 'globe'
  | 'screen'
  | 'neural'
  | 'portrait'
  | 'crate'
  | 'dial'
  | 'scale'
  | 'quantum'

interface ModelSpec {
  kit: KitName
  footprint: 'plinth' | 'floor'
  portraitCount?: number
}

// ---- archetype -> exhibit mapping ------------------------------------------

const MODELS: Record<string, ModelSpec> = {
  P1: { kit: 'gears', footprint: 'plinth' },
  P2: { kit: 'book', footprint: 'plinth' },
  P3: { kit: 'cards', footprint: 'plinth' },
  P4: { kit: 'gears', footprint: 'plinth' },
  P5: { kit: 'book', footprint: 'plinth' },
  P6: { kit: 'book', footprint: 'plinth' },
  P7: { kit: 'cards', footprint: 'plinth' },
  A2: { kit: 'chip', footprint: 'plinth' },
  A3: { kit: 'tubes', footprint: 'plinth' },
  A4: { kit: 'globe', footprint: 'plinth' },
  A5: { kit: 'portrait', footprint: 'plinth', portraitCount: 1 },
  A6: { kit: 'gears', footprint: 'plinth' },
  A7: { kit: 'globe', footprint: 'plinth' },
  A8: { kit: 'quantum', footprint: 'plinth' },
  A9: { kit: 'globe', footprint: 'plinth' },
  B1: { kit: 'rack', footprint: 'floor' },
  B4: { kit: 'rack', footprint: 'floor' },
  B5: { kit: 'chip', footprint: 'plinth' },
  B6: { kit: 'chip', footprint: 'plinth' },
  B7: { kit: 'chip', footprint: 'plinth' },
  B8: { kit: 'rack', footprint: 'floor' },
  B9: { kit: 'chip', footprint: 'plinth' },
  B10: { kit: 'chip', footprint: 'plinth' },
  B12: { kit: 'quantum', footprint: 'floor' },
  C2: { kit: 'portrait', footprint: 'plinth', portraitCount: 1 },
  C4: { kit: 'cards', footprint: 'plinth' },
  C5: { kit: 'portrait', footprint: 'plinth', portraitCount: 1 },
  C6: { kit: 'crate', footprint: 'plinth' },
  C7: { kit: 'crate', footprint: 'plinth' },
  C8: { kit: 'crate', footprint: 'plinth' },
  C9: { kit: 'crate', footprint: 'plinth' },
  D1: { kit: 'globe', footprint: 'plinth' },
  D2: { kit: 'screen', footprint: 'plinth' },
  D3: { kit: 'globe', footprint: 'plinth' },
  D4: { kit: 'globe', footprint: 'plinth' },
  D5: { kit: 'globe', footprint: 'plinth' },
  D8: { kit: 'screen', footprint: 'plinth' },
  D9: { kit: 'globe', footprint: 'plinth' },
  D10: { kit: 'globe', footprint: 'plinth' },
  D11: { kit: 'globe', footprint: 'plinth' },
  E1: { kit: 'dial', footprint: 'plinth' },
  E2: { kit: 'screen', footprint: 'plinth' },
  E4: { kit: 'dial', footprint: 'plinth' },
  E5: { kit: 'dial', footprint: 'plinth' },
  E6: { kit: 'screen', footprint: 'plinth' },
  E7: { kit: 'screen', footprint: 'plinth' },
  E8: { kit: 'screen', footprint: 'plinth' },
  F1: { kit: 'screen', footprint: 'plinth' },
  F3: { kit: 'neural', footprint: 'plinth' },
  F4: { kit: 'screen', footprint: 'plinth' },
  F5: { kit: 'scale', footprint: 'plinth' },
  F6: { kit: 'neural', footprint: 'plinth' },
  F8: { kit: 'neural', footprint: 'plinth' },
  F9: { kit: 'neural', footprint: 'floor' },
  F11: { kit: 'neural', footprint: 'plinth' },
  G1: { kit: 'portrait', footprint: 'plinth', portraitCount: 3 },
  G2: { kit: 'portrait', footprint: 'plinth', portraitCount: 3 },
  G3: { kit: 'screen', footprint: 'plinth' },
  S1: { kit: 'scale', footprint: 'plinth' },
  S2: { kit: 'scale', footprint: 'plinth' },
  S3: { kit: 'scale', footprint: 'plinth' },
  S4: { kit: 'scale', footprint: 'plinth' },
  X1: { kit: 'quantum', footprint: 'plinth' }
}

// Base colors are brightened well above the "near black" original palette so the
// objects read against the stone/timber interior under the dim baked-lightmap
// lighting (hemisphere drops to 0.05 once lightmaps load). Each base material
// also carries a small self-emissive lift (see buildScene) matching the visible
// white-glow placeholder icons these replace.
const BASE_COLORS: Record<KitName, number> = {
  gears: 0xd0a862,
  book: 0xa4713f,
  cards: 0xe8e2cf,
  tubes: 0x78808a,
  chip: 0x2f6b4f,
  rack: 0x6a7178,
  globe: 0x3f8fb8,
  screen: 0x4a5159,
  neural: 0x7a838c,
  portrait: 0xd6cfc0,
  crate: 0xb98a52,
  dial: 0x6a7178,
  scale: 0xb0b6bd,
  quantum: 0x555c66
}

const ACCENT_COLOR = 0xffe3a8

function buildParts(spec: ModelSpec): Parts {
  switch (spec.kit) {
    case 'gears':
      return kitGears(1)
    case 'book':
      return kitBook(1)
    case 'cards':
      return kitCards(1)
    case 'tubes':
      return kitTubes(1)
    case 'chip':
      return kitChip(1)
    case 'rack':
      return kitRack(1)
    case 'globe':
      return kitGlobe(1)
    case 'screen':
      return kitScreen(1)
    case 'neural':
      return kitNeural(1)
    case 'portrait':
      return kitPortrait(1, spec.portraitCount ?? 1)
    case 'crate':
      return kitCrate(1)
    case 'dial':
      return kitDial(1)
    case 'scale':
      return kitScale(1)
    case 'quantum':
      return kitQuantum(1)
  }
}

function buildScene(spec: ModelSpec): { scene: THREE.Scene; meshes: THREE.Mesh[] } {
  const parts = buildParts(spec)
  const scene = new THREE.Scene()
  const meshes: THREE.Mesh[] = []

  const baseMat = new THREE.MeshStandardMaterial({
    color: BASE_COLORS[spec.kit],
    roughness: 0.5,
    metalness: 0.1,
    emissive: BASE_COLORS[spec.kit],
    emissiveIntensity: 0.32
  })
  const baseMerged = mergeGeometries(parts.base, false)
  if (baseMerged) {
    baseMerged.computeVertexNormals()
    meshes.push(new THREE.Mesh(baseMerged, baseMat))
  }

  if (parts.accent.length > 0) {
    const accentMat = new THREE.MeshStandardMaterial({
      color: ACCENT_COLOR,
      roughness: 0.4,
      emissive: ACCENT_COLOR,
      emissiveIntensity: 1.4
    })
    const accentMerged = mergeGeometries(parts.accent, false)
    if (accentMerged) {
      accentMerged.computeVertexNormals()
      meshes.push(new THREE.Mesh(accentMerged, accentMat))
    }
  }

  for (const mesh of meshes) scene.add(mesh)
  return { scene, meshes }
}

// ---- Node GLTFExporter shim ------------------------------------------------

function ensureFileReader(): void {
  const host = globalThis as unknown as { FileReader?: unknown }
  if (typeof host.FileReader !== 'undefined') return
  class NodeFileReader {
    result: string | ArrayBuffer | null = null
    onloadend: (() => void) | null = null
    readAsArrayBuffer(blob: Blob): void {
      void blob.arrayBuffer().then((buf) => {
        this.result = buf
        this.onloadend?.()
      })
    }
    readAsDataURL(blob: Blob): void {
      void blob.arrayBuffer().then((buf) => {
        this.result = `data:application/octet-stream;base64,${Buffer.from(buf).toString('base64')}`
        this.onloadend?.()
      })
    }
  }
  ;(globalThis as unknown as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader
}

async function exportGlb(id: string, spec: ModelSpec, target: string): Promise<number> {
  ensureFileReader()
  const { scene, meshes } = buildScene(spec)
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    new GLTFExporter().parse(
      scene,
      (result) => resolve(result as ArrayBuffer),
      (error) => reject(new Error(error instanceof Error ? error.message : String(error))),
      { binary: true }
    )
  })
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, new Uint8Array(bytes))
  for (const mesh of meshes) mesh.geometry.dispose()
  return bytes.byteLength
}

// ---- exhibits.json wiring --------------------------------------------------

interface RawExhibit {
  id: string
  model?: { kind: string; footprint: string }
  footprint?: { w: number; d: number; h: number; floor: boolean }
}

interface RawExhibitsFile {
  scopeVersion: string
  exhibits: RawExhibit[]
}

const FLOOR_FOOTPRINT = { w: 2.3, d: 2, h: 0.06, floor: true }

function wireExhibits(exhibitsPath: string): void {
  const raw = JSON.parse(readFileSync(exhibitsPath, 'utf8')) as RawExhibitsFile
  for (const exhibit of raw.exhibits) {
    const spec = MODELS[exhibit.id]
    if (!spec) continue
    exhibit.model = { kind: 'glb', footprint: spec.footprint }
    if (spec.footprint === 'floor') {
      exhibit.footprint = { ...FLOOR_FOOTPRINT }
    } else {
      delete exhibit.footprint
    }
  }
  writeFileSync(exhibitsPath, JSON.stringify(raw, null, 1).replace(/\r?\n/g, '\r\n') + '\r\n')
}

// ---- entry ----------------------------------------------------------------

async function main(): Promise<void> {
  const outDir = join(root('../../..'), 'assets', 'out')
  const exhibitsPath = join(root('../../..'), 'packages', 'content', 'data', 'exhibits.json')
  const ids = Object.keys(MODELS).sort()
  for (const id of ids) {
    const spec = MODELS[id] as ModelSpec
    const target = join(outDir, `${id}.glb`)
    const bytes = await exportGlb(id, spec, target)
    console.log(`generated ${id} -> ${target} (${bytes} bytes)`)
  }
  wireExhibits(exhibitsPath)
  console.log(`wired model + footprint for ${ids.length} exhibits`)
}

void main()
