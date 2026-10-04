import type { Tier } from '@museum/content/schema'

export interface Footprint {
  w: number
  d: number
  h: number
  floor: boolean
}

type FootprintSource = {
  tier: Tier
  footprint?: Footprint | undefined
}

/** Stand size. Built exhibits read `footprint` from content. Placeholders use the prototype plinths. */
export function footprintFor(exhibit: FootprintSource): Footprint {
  if (exhibit.footprint) return exhibit.footprint
  if (exhibit.tier === 'core') return { w: 0.9, d: 0.9, h: 1, floor: false }
  if (exhibit.tier === 'extended') return { w: 0.9, d: 0.9, h: 0.85, floor: false }
  if (exhibit.tier === 'open') return { w: 1.36, d: 1.36, h: 0.8, floor: false }
  return { w: 1.3, d: 1.3, h: 0.95, floor: false }
}

/** Y of a built exhibit object's base, resting on its stand (matches the prototype). */
export function modelBaseY(fp: Footprint): number {
  return fp.floor ? fp.h : fp.h + 0.03
}

/** Neutral model box until plan 09 supplies a GLB. Sized from the stand footprint. */
export function modelSlot(fp: Footprint): { w: number; h: number; d: number; y: number } {
  if (fp.floor) {
    const w = Math.min(1.05, fp.w * 0.42)
    const d = Math.min(0.9, fp.d * 0.42)
    const h = 1.1
    return { w, h, d, y: fp.h + h / 2 }
  }
  const s = Math.min(0.55, fp.w * 0.42)
  return { w: s, h: s, d: s, y: fp.h + 0.03 + s / 2 }
}
