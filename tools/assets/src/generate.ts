import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Programmatic GLB generator (plan 16, upgraded in plan 17 / decision 0012).
 *
 * Composes a recognisable object per Core + Extended exhibit from bevelled
 * three.js primitives, merges each object into at most two meshes (a primary
 * and a secondary material) so the runtime draw-call budget is met, and
 * exports `assets/out/<ID>.glb`. `pnpm assets:build` then optimises each into
 * `apps/web/public/models/<ID>.glb`.
 *
 * Materials are physically based (brass, walnut, bakelite, aluminium, PCB
 * green, bronze, paper). Nothing self-illuminates except a dim glow on
 * screens, valve filaments and network nodes, so objects shade properly under
 * the gallery lighting.
 *
 * Objects are authored with their base at y = 0, sized for a 0.9 m plinth
 * (about 0.5 m tall) or standing on the floor (racks, up to about 1.9 m).
 */

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// ---- primitives ------------------------------------------------------------

/** Bevelled box: edges rounded by up to 12 % of the smallest side (max 1.5 cm). */
function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const r = Math.min(0.015, Math.min(w, h, d) * 0.12)
  const g = r > 0.002 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

function cyl(rt: number, rb: number, h: number, x = 0, y = 0, z = 0, segments = 24): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, segments)
  g.translate(x, y, z)
  return g
}

/** Cylinder with a chamfered rim, lathed so the edge catches light. */
function disc(r: number, h: number, x = 0, y = 0, z = 0, segments = 32): THREE.BufferGeometry {
  const c = Math.min(h * 0.3, r * 0.1)
  const pts = [
    new THREE.Vector2(0, -h / 2),
    new THREE.Vector2(r - c, -h / 2),
    new THREE.Vector2(r, -h / 2 + c),
    new THREE.Vector2(r, h / 2 - c),
    new THREE.Vector2(r - c, h / 2),
    new THREE.Vector2(0, h / 2)
  ]
  const g = new THREE.LatheGeometry(pts, segments)
  g.translate(x, y, z)
  return g
}

function sphere(r: number, x = 0, y = 0, z = 0, ws = 20, hs = 14): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, ws, hs)
  g.translate(x, y, z)
  return g
}

function torus(r: number, tube: number, x = 0, y = 0, z = 0, radial = 10, tubular = 40): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, radial, tubular)
  g.translate(x, y, z)
  return g
}

function gear(r: number, thickness: number, teeth: number, x = 0, y = 0, z = 0): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [disc(r - 0.05, thickness, x, y, z, 40)]
  parts.push(cyl(0.025, 0.025, thickness + 0.04, x, y, z, 16))
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    const t = box(0.06, thickness, 0.07)
    t.rotateY(-a)
    t.translate(x + Math.cos(a) * (r - 0.01), y, z + Math.sin(a) * (r - 0.01))
    parts.push(t)
  }
  return parts
}

// ---- materials -------------------------------------------------------------

interface Finish {
  color: number
  roughness: number
  metalness: number
  /** Optional faint glow (screens, filaments, nodes). */
  emissive?: number
  emissiveIntensity?: number
}

const FINISH = {
  brass: { color: 0xc8a062, roughness: 0.32, metalness: 1 },
  bronze: { color: 0x7a5a3a, roughness: 0.42, metalness: 0.85 },
  walnut: { color: 0x4a2c1c, roughness: 0.55, metalness: 0 },
  leather: { color: 0x6b2e1f, roughness: 0.62, metalness: 0 },
  paper: { color: 0xefe5cc, roughness: 0.9, metalness: 0 },
  manila: { color: 0xe3d3a6, roughness: 0.85, metalness: 0 },
  aluminium: { color: 0xb9bdc3, roughness: 0.32, metalness: 0.95 },
  steelPaint: { color: 0x3b4148, roughness: 0.48, metalness: 0.55 },
  pcb: { color: 0x1d5a3b, roughness: 0.5, metalness: 0.05 },
  ceramic: { color: 0x1a1a1c, roughness: 0.35, metalness: 0.1 },
  ocean: { color: 0x2c6a93, roughness: 0.42, metalness: 0.05 },
  bakelite: { color: 0x2b1e16, roughness: 0.3, metalness: 0.05 },
  beige: { color: 0xd8ccb2, roughness: 0.48, metalness: 0 },
  screen: { color: 0x0e1a14, roughness: 0.12, metalness: 0.1, emissive: 0x2f6b4a, emissiveIntensity: 0.35 },
  filament: { color: 0xffd9a0, roughness: 0.3, metalness: 0, emissive: 0xff9a3c, emissiveIntensity: 0.9 },
  node: { color: 0xffc070, roughness: 0.25, metalness: 0.1, emissive: 0xff9a3c, emissiveIntensity: 0.35 },
  marble: { color: 0xe9e2d4, roughness: 0.28, metalness: 0 },
  pine: { color: 0xb38b5a, roughness: 0.78, metalness: 0 },
  gold: { color: 0xd7a650, roughness: 0.22, metalness: 1 },
  copper: { color: 0xb8733f, roughness: 0.3, metalness: 1 }
} satisfies Record<string, Finish>

type FinishName = keyof typeof FINISH

// ---- kits ------------------------------------------------------------------

interface Kit {
  primary: THREE.BufferGeometry[]
  primaryFinish: FinishName
  secondary: THREE.BufferGeometry[]
  secondaryFinish: FinishName
}

function kitGears(): Kit {
  // Authored flat with height on -z, then stood upright: rotateX maps (x, 0, -h) to (x, h, 0).
  const primary = [
    ...gear(0.24, 0.05, 12, -0.15, 0, -0.33),
    ...gear(0.16, 0.05, 9, 0.17, 0, -0.27),
    ...gear(0.09, 0.05, 7, 0.19, 0, -0.5)
  ]
  for (const g of primary) g.rotateX(Math.PI / 2)
  const secondary = [
    box(0.68, 0.05, 0.3, 0, 0.025, 0),
    box(0.04, 0.33, 0.04, -0.15, 0.19, -0.05),
    box(0.04, 0.27, 0.04, 0.17, 0.16, -0.05),
    box(0.03, 0.5, 0.03, 0.19, 0.27, -0.08)
  ]
  return { primary, primaryFinish: 'brass', secondary, secondaryFinish: 'walnut' }
}

function kitBook(): Kit {
  const w = 0.38
  const h = 0.52
  const t = 0.018
  const left = box(w / 2, t, h, -w / 4 - 0.01, 0.06, 0)
  left.rotateZ(0.12)
  const right = box(w / 2, t, h, w / 4 + 0.01, 0.06, 0)
  right.rotateZ(-0.12)
  const primary = [box(w + 0.04, t, h + 0.03, 0, 0.012, 0), box(0.04, 0.05, h + 0.03, 0, 0.035, 0)]
  const secondary = [left, right]
  for (let i = 1; i <= 3; i++) {
    const page = box(w / 2 - 0.01, 0.004, h - 0.01, -w / 4 - 0.01, 0.07 + i * 0.006, 0)
    page.rotateZ(0.12 - i * 0.02)
    secondary.push(page)
  }
  // A reading stand behind the book.
  const stand = box(0.3, 0.02, 0.24, 0, 0.12, -0.22)
  stand.rotateX(-0.9)
  primary.push(stand)
  return { primary, primaryFinish: 'leather', secondary, secondaryFinish: 'paper' }
}

function kitCards(): Kit {
  const w = 0.42
  const d = 0.19
  const t = 0.004
  const primary: THREE.BufferGeometry[] = []
  for (let i = 0; i < 14; i++) {
    const card = box(w, t, d, (i % 3) * 0.004, 0.04 + i * t * 1.3, (i % 2) * 0.003)
    card.rotateY(((i % 5) - 2) * 0.01)
    primary.push(card)
  }
  const fanned = box(w, t, d, 0.1, 0.15, 0.16)
  fanned.rotateY(0.5)
  primary.push(fanned)
  const secondary = [box(0.56, 0.035, 0.34, 0, 0.0175, 0.04)]
  return { primary, primaryFinish: 'manila', secondary, secondaryFinish: 'walnut' }
}

function kitTubes(): Kit {
  const primary: THREE.BufferGeometry[] = [box(0.62, 0.08, 0.32, 0, 0.04, 0)]
  const secondary: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.11
    primary.push(disc(0.04, 0.03, x, 0.095, 0, 20))
    primary.push(cyl(0.032, 0.036, 0.3, x, 0.26, 0, 20))
    primary.push(sphere(0.032, x, 0.41, 0, 16, 10))
    secondary.push(cyl(0.008, 0.008, 0.16, x, 0.24, 0, 8))
  }
  for (const x of [-0.27, 0.27]) primary.push(cyl(0.015, 0.015, 0.04, x, 0.1, 0.12, 12))
  return { primary, primaryFinish: 'aluminium', secondary, secondaryFinish: 'filament' }
}

function kitChip(): Kit {
  const w = 0.58
  const primary: THREE.BufferGeometry[] = [box(w, 0.025, w * 0.72, 0, 0.0125, 0)]
  for (let i = 0; i < 6; i++) primary.push(box(0.012, 0.004, w * 0.6, -0.22 + i * 0.012 * 3, 0.027, 0))
  const secondary: THREE.BufferGeometry[] = [box(0.24, 0.045, 0.24, 0, 0.05, 0)]
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 8; i++) {
      secondary.push(box(0.012, 0.02, 0.04, -0.105 + i * 0.03, 0.035, s * 0.135))
    }
  }
  secondary.push(box(0.08, 0.03, 0.05, 0.19, 0.04, 0.1), box(0.06, 0.03, 0.06, -0.2, 0.04, -0.09))
  return { primary, primaryFinish: 'pcb', secondary, secondaryFinish: 'ceramic' }
}

function kitRack(): Kit {
  const h = 1.8
  const primary: THREE.BufferGeometry[] = [
    box(0.72, h, 0.6, 0, h / 2 + 0.06, 0),
    box(0.76, 0.06, 0.64, 0, 0.03, 0),
    box(0.76, 0.04, 0.64, 0, h + 0.08, 0)
  ]
  const secondary: THREE.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) {
    const y = 0.3 + i * 0.26
    secondary.push(box(0.6, 0.2, 0.03, 0, y, 0.31))
    secondary.push(disc(0.03, 0.02, 0, 0, 0, 16).rotateX(Math.PI / 2).translate(-0.22, y, 0.33))
    secondary.push(box(0.22, 0.012, 0.012, 0.1, y + 0.05, 0.33))
  }
  return { primary, primaryFinish: 'steelPaint', secondary, secondaryFinish: 'aluminium' }
}

function kitGlobe(): Kit {
  const primary = [sphere(0.25, 0, 0.34, 0, 40, 28)]
  const ring = torus(0.29, 0.01, 0, 0, 0, 8, 64)
  ring.rotateZ(0.41)
  ring.translate(0, 0.34, 0)
  const secondary = [ring, disc(0.13, 0.03, 0, 0.015, 0, 40), cyl(0.012, 0.016, 0.1, 0, 0.07, 0, 12)]
  return { primary, primaryFinish: 'ocean', secondary, secondaryFinish: 'brass' }
}

function kitScreen(): Kit {
  const primary = [
    box(0.5, 0.4, 0.42, 0, 0.3, -0.04),
    box(0.3, 0.06, 0.24, 0, 0.03, 0),
    box(0.46, 0.06, 0.18, 0, 0.03, 0.26)
  ]
  for (let i = 0; i < 4; i++) primary.push(box(0.07, 0.015, 0.05, -0.15 + i * 0.1, 0.07, 0.26))
  const secondary = [box(0.38, 0.28, 0.02, 0, 0.31, 0.175)]
  return { primary, primaryFinish: 'beige', secondary, secondaryFinish: 'screen' }
}

function edgeCyl(y0: number, y1: number, x0: number, x1: number): THREE.BufferGeometry {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const g = new THREE.CylinderGeometry(0.006, 0.006, len, 6)
  g.rotateZ(Math.atan2(dy, dx) - Math.PI / 2)
  g.translate(x0 + dx / 2, y0 + dy / 2, 0)
  return g
}

function kitNeural(): Kit {
  const primary: THREE.BufferGeometry[] = [box(0.6, 0.03, 0.2, 0, 0.015, 0), cyl(0.012, 0.012, 0.06, -0.25, 0.05, 0), cyl(0.012, 0.012, 0.06, 0.25, 0.05, 0)]
  const secondary: THREE.BufferGeometry[] = []
  const layers: [number, number][] = [
    [-0.22, 3],
    [0, 5],
    [0.22, 3]
  ]
  let prev: number[] = []
  layers.forEach(([lx, count], li) => {
    const ys: number[] = []
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * 0.11 + 0.32
      ys.push(y)
      secondary.push(sphere(0.035, lx, y, 0, 16, 10))
    }
    if (li > 0) {
      const px = layers[li - 1]?.[0] ?? 0
      for (const py of prev) for (const cy of ys) primary.push(edgeCyl(py, cy, px, lx))
    }
    prev = ys
  })
  return { primary, primaryFinish: 'aluminium', secondary, secondaryFinish: 'node' }
}

function kitPortrait(count: number): Kit {
  const primary: THREE.BufferGeometry[] = []
  const heads = count === 1 ? [0] : [-0.15, 0, 0.15]
  for (const hx of heads) {
    const s = count === 1 ? 1 : 0.75
    primary.push(sphere(0.085 * s, hx, 0.3 * s + 0.08, 0, 24, 16))
    primary.push(cyl(0.035 * s, 0.045 * s, 0.07 * s, hx, 0.22 * s + 0.07, 0, 16))
    const shoulders = sphere(0.12 * s, 0, 0, 0, 24, 12)
    shoulders.scale(1, 0.55, 0.6)
    shoulders.translate(hx, 0.13 * s + 0.08, 0)
    primary.push(shoulders)
  }
  const secondary = [box(0.62, 0.06, 0.26, 0, 0.03, 0), box(0.5, 0.03, 0.22, 0, 0.075, 0)]
  return { primary, primaryFinish: 'bronze', secondary, secondaryFinish: 'marble' }
}

function kitCrate(): Kit {
  const primary = [box(0.48, 0.26, 0.38, 0, 0.13, 0), box(0.38, 0.22, 0.3, 0.02, 0.37, -0.02)]
  const secondary: THREE.BufferGeometry[] = []
  for (const y of [0.04, 0.22]) secondary.push(box(0.5, 0.025, 0.4, 0, y, 0))
  secondary.push(box(0.4, 0.02, 0.32, 0.02, 0.46, -0.02))
  return { primary, primaryFinish: 'pine', secondary, secondaryFinish: 'bronze' }
}

function kitDial(): Kit {
  const primary = [box(0.52, 0.38, 0.16, 0, 0.21, 0), box(0.56, 0.03, 0.2, 0, 0.015, 0)]
  for (const dx of [-0.16, 0.16]) primary.push(disc(0.028, 0.03, 0, 0, 0, 20).rotateX(Math.PI / 2).translate(dx, 0.08, 0.09))
  const face = disc(0.12, 0.02, 0, 0, 0, 40)
  face.rotateX(Math.PI / 2)
  face.translate(0, 0.25, 0.085)
  const secondary = [face, torus(0.125, 0.008, 0, 0.25, 0.09, 8, 48)]
  const needle = box(0.008, 0.1, 0.004, 0, 0.29, 0.1)
  needle.rotateZ(0.5)
  secondary.push(needle)
  return { primary, primaryFinish: 'bakelite', secondary, secondaryFinish: 'brass' }
}

function kitScale(): Kit {
  const primary = [
    cyl(0.018, 0.022, 0.5, 0, 0.29, 0, 16),
    box(0.58, 0.02, 0.03, 0, 0.55, 0),
    sphere(0.03, 0, 0.56, 0),
    disc(0.08, 0.02, -0.26, 0.42, 0, 32),
    disc(0.08, 0.02, 0.26, 0.42, 0, 32)
  ]
  for (const sx of [-0.26, 0.26]) {
    primary.push(cyl(0.003, 0.003, 0.13, sx - 0.05, 0.49, 0, 6), cyl(0.003, 0.003, 0.13, sx + 0.05, 0.49, 0, 6))
  }
  const secondary = [box(0.3, 0.05, 0.22, 0, 0.025, 0)]
  return { primary, primaryFinish: 'brass', secondary, secondaryFinish: 'walnut' }
}

function kitQuantum(): Kit {
  const primary: THREE.BufferGeometry[] = []
  const tiers = [0.48, 0.34, 0.2]
  tiers.forEach((y, i) => {
    primary.push(disc(0.2 - i * 0.04, 0.018, 0, y, 0, 40))
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      primary.push(cyl(0.006, 0.006, 0.14, Math.cos(a) * (0.14 - i * 0.03), y - 0.075, Math.sin(a) * (0.14 - i * 0.03), 6))
    }
  })
  primary.push(cyl(0.02, 0.02, 0.1, 0, 0.11, 0, 16), disc(0.05, 0.02, 0, 0.055, 0, 24))
  const secondary: THREE.BufferGeometry[] = [disc(0.24, 0.025, 0, 0.53, 0, 48), box(0.36, 0.03, 0.36, 0, 0.015, 0)]
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) secondary.push(cyl(0.008, 0.008, 0.52, sx * 0.15, 0.28, sz * 0.15, 8))
  return { primary, primaryFinish: 'gold', secondary, secondaryFinish: 'copper' }
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

/** Floor-standing pieces other than racks are shown at a larger scale on their dais. */
const FLOOR_SCALE: Partial<Record<KitName, number>> = { quantum: 2.4, neural: 2.2 }

function buildKit(spec: ModelSpec): Kit {
  switch (spec.kit) {
    case 'gears':
      return kitGears()
    case 'book':
      return kitBook()
    case 'cards':
      return kitCards()
    case 'tubes':
      return kitTubes()
    case 'chip':
      return kitChip()
    case 'rack':
      return kitRack()
    case 'globe':
      return kitGlobe()
    case 'screen':
      return kitScreen()
    case 'neural':
      return kitNeural()
    case 'portrait':
      return kitPortrait(spec.portraitCount ?? 1)
    case 'crate':
      return kitCrate()
    case 'dial':
      return kitDial()
    case 'scale':
      return kitScale()
    case 'quantum':
      return kitQuantum()
  }
}

function material(name: FinishName): THREE.MeshStandardMaterial {
  const f: Finish = FINISH[name]
  const m = new THREE.MeshStandardMaterial({
    color: f.color,
    roughness: f.roughness,
    metalness: f.metalness
  })
  m.name = name
  if (f.emissive !== undefined) {
    m.emissive.set(f.emissive)
    m.emissiveIntensity = f.emissiveIntensity ?? 1
  }
  return m
}

/** Merges geometries that may mix indexed and non-indexed inputs. */
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null
  const flat = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g
    for (const name of Object.keys(n.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') n.deleteAttribute(name)
    }
    return n
  })
  return mergeGeometries(flat, false)
}

function buildScene(spec: ModelSpec): { scene: THREE.Scene; meshes: THREE.Mesh[] } {
  const kit = buildKit(spec)
  const scene = new THREE.Scene()
  const meshes: THREE.Mesh[] = []
  const scale = spec.footprint === 'floor' ? (FLOOR_SCALE[spec.kit] ?? 1) : 1
  for (const [geos, finish] of [
    [kit.primary, kit.primaryFinish],
    [kit.secondary, kit.secondaryFinish]
  ] as const) {
    const merged = merge(geos)
    if (!merged) continue
    if (scale !== 1) merged.scale(scale, scale, scale)
    meshes.push(new THREE.Mesh(merged, material(finish)))
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

async function exportGlb(spec: ModelSpec, target: string): Promise<number> {
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
  const before = readFileSync(exhibitsPath, 'utf8')
  const raw = JSON.parse(before) as RawExhibitsFile
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
  if (JSON.stringify(raw) === JSON.stringify(JSON.parse(before))) return
  writeFileSync(exhibitsPath, JSON.stringify(raw, null, 2) + '\n')
}

// ---- entry ----------------------------------------------------------------

async function main(): Promise<void> {
  const outDir = join(root('../../..'), 'assets', 'out')
  const exhibitsPath = join(root('../../..'), 'packages', 'content', 'data', 'exhibits.json')
  const ids = Object.keys(MODELS).sort()
  for (const id of ids) {
    const spec = MODELS[id] as ModelSpec
    const target = join(outDir, `${id}.glb`)
    const bytes = await exportGlb(spec, target)
    console.log(`generated ${id} -> ${target} (${bytes} bytes)`)
  }
  wireExhibits(exhibitsPath)
  console.log(`wired model + footprint for ${ids.length} exhibits`)
}

void main()
