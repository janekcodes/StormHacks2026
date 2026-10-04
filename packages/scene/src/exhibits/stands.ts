import type { Tier } from '@museum/content/schema'
import { footprintFor, type Footprint } from './footprint'

/** Materials a stand part can use (keys of `museumMaterials()`). */
export type StandMaterial =
  | 'wood'
  | 'polished'
  | 'limestone'
  | 'brass'
  | 'bronze'
  | 'velvet'
  | 'glass'
  | 'caseLight'

export interface StandPart {
  mat: StandMaterial
  shape: 'box' | 'post'
  /** Local position in the exhibit frame (+z faces the visitor). */
  at: readonly [number, number, number]
  size: readonly [number, number, number]
  rotX?: number
  rotY?: number
}

export interface PlaqueLocal {
  x: number
  y: number
  z: number
  rotX: number
}

interface StandSource {
  tier: Tier
  footprint?: Footprint | undefined
}

const box = (
  mat: StandMaterial,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  rotX = 0,
  rotY = 0
): StandPart => ({ mat, shape: 'box', at: [x, y, z], size: [w, h, d], rotX, rotY })

const post = (mat: StandMaterial, x: number, y0: number, y1: number, z: number, r: number): StandPart => ({
  mat,
  shape: 'post',
  at: [x, (y0 + y1) / 2, z],
  size: [r * 2, y1 - y0, r * 2]
})

/** Where the exhibit label sits, in the exhibit frame. */
export function plaqueLocal(exhibit: StandSource): PlaqueLocal {
  const fp = footprintFor(exhibit)
  if (fp.floor) return { x: 0.75, y: 0.98, z: fp.d / 2 + 0.24, rotX: -0.95 }
  if (exhibit.tier === 'built') return { x: 0, y: fp.h - 0.22, z: fp.w / 2 + 0.012, rotX: -0.3 }
  if (exhibit.tier === 'open') return { x: 0, y: 0.84, z: 0.04, rotX: -0.95 }
  if (exhibit.tier === 'extended') return { x: 0, y: fp.h - 0.3, z: 0.385, rotX: -0.3 }
  return { x: 0, y: fp.h - 0.2, z: fp.w / 2 + 0.012, rotX: -0.3 }
}

/** Brass backing behind the label, plus a reading post where the label stands alone. */
function plaqueMount(exhibit: StandSource): StandPart[] {
  const p = plaqueLocal(exhibit)
  const back = 0.009
  const parts: StandPart[] = [
    box(
      'brass',
      p.x,
      p.y - Math.sin(-p.rotX) * back,
      p.z - Math.cos(-p.rotX) * back,
      0.45,
      0.28,
      0.012,
      p.rotX
    )
  ]
  const fp = footprintFor(exhibit)
  if (fp.floor || exhibit.tier === 'open') {
    parts.push(post('brass', p.x, 0, p.y - 0.1, p.z - 0.05, 0.022))
    parts.push(post('bronze', p.x, 0, 0.012, p.z - 0.05, 0.13))
  }
  return parts
}

/** Low stone dais with a brass edge, brass stanchions and velvet rope. */
function floorStand(w: number, d: number, h: number, parts: StandPart[]): void {
  parts.push(box('brass', 0, 0.008, 0, w + 0.04, 0.016, d + 0.04))
  parts.push(box('limestone', 0, h / 2, 0, w, h, d))
  const px = w / 2 + 0.12
  const pz = d / 2 + 0.12
  const posts: [number, number][] = [
    [-px, -pz],
    [px, -pz],
    [px, pz],
    [-px, pz],
    [0, pz]
  ]
  for (const [x, z] of posts) {
    parts.push(post('brass', x, 0, 0.92, z, 0.024))
    parts.push(post('brass', x, 0, 0.03, z, 0.12))
    parts.push(post('brass', x, 0.92, 0.97, z, 0.04))
  }
  const rope = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0)
    parts.push(box('velvet', (x0 + x1) / 2, 0.84, (z0 + z1) / 2, len, 0.035, 0.035, 0, Math.atan2(-(z1 - z0), x1 - x0)))
  }
  rope(-px, pz, 0, pz)
  rope(0, pz, px, pz)
  rope(-px, -pz, -px, pz)
  rope(px, -pz, px, pz)
}

/**
 * The heritage display furniture for one exhibit (decision 0012). Everything
 * stays inside the footprint used for collision, except floor-stand
 * stanchions, which sit within the player's wall clearance.
 */
export function standParts(exhibit: StandSource): StandPart[] {
  const fp = footprintFor(exhibit)
  const parts: StandPart[] = []
  const { w, d, h } = fp

  if (fp.floor) {
    floorStand(w, d, h, parts)
  } else if (exhibit.tier === 'core') {
    // Walnut plinth on a recessed bronze toe-kick, marble top, brass-framed vitrine.
    parts.push(box('bronze', 0, 0.04, 0, w - 0.1, 0.08, d - 0.1))
    parts.push(box('wood', 0, 0.08 + (h - 0.16) / 2, 0, w - 0.04, h - 0.16, d - 0.04))
    parts.push(box('wood', 0, 0.12, 0, w, 0.06, d))
    parts.push(box('polished', 0, h - 0.04, 0, w, 0.08, d))
    parts.push(box('velvet', 0, h + 0.012, 0, w - 0.12, 0.024, d - 0.12))
    const cw = w - 0.06
    const ch = 0.64
    parts.push(box('glass', 0, h + ch / 2, 0, cw, ch, cw))
    const e = cw / 2
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ] as const) {
      parts.push(box('brass', sx * e, h + ch / 2, sz * e, 0.022, ch, 0.022))
    }
    parts.push(box('brass', 0, h + ch, e, cw + 0.02, 0.026, 0.026))
    parts.push(box('brass', 0, h + ch, -e, cw + 0.02, 0.026, 0.026))
    parts.push(box('brass', e, h + ch, 0, 0.026, 0.026, cw))
    parts.push(box('brass', -e, h + ch, 0, 0.026, 0.026, cw))
    parts.push(box('brass', 0, h + 0.012, e, cw + 0.02, 0.024, 0.024))
    parts.push(box('caseLight', 0, h + ch - 0.03, e - 0.05, cw - 0.12, 0.012, 0.03))
  } else if (exhibit.tier === 'extended') {
    // Stepped walnut pedestal, brass lip, marble top and a low glass bonnet.
    parts.push(box('wood', 0, 0.05, 0, w, 0.1, d))
    parts.push(box('wood', 0, 0.1 + (h - 0.18) / 2, 0, w - 0.16, h - 0.18, d - 0.16))
    parts.push(box('brass', 0, h - 0.065, 0, w - 0.08, 0.03, d - 0.08))
    parts.push(box('polished', 0, h - 0.025, 0, w - 0.1, 0.05, d - 0.1))
    parts.push(box('glass', 0, h + 0.26, 0, w - 0.2, 0.52, d - 0.2))
    parts.push(box('brass', 0, h + 0.52, 0, w - 0.18, 0.016, d - 0.18))
  } else if (exhibit.tier === 'built') {
    // Stone plinth with a plinth course and a bronze cap.
    parts.push(box('limestone', 0, 0.05, 0, w + 0.04, 0.1, d + 0.04))
    parts.push(box('limestone', 0, 0.1 + (h - 0.13) / 2, 0, w, h - 0.13, d))
    parts.push(box('bronze', 0, h - 0.015, 0, w + 0.03, 0.03, d + 0.03))
  }

  parts.push(...plaqueMount(exhibit))
  return parts
}
