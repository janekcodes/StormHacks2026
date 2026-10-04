import type { Building } from '@museum/content/plan-schema'
import type { Footprint, Tier } from '@museum/content/schema'
import { footprintFor } from '../exhibits/footprint'

export type Seg = readonly [number, number, number, number]
export type Circle = readonly [number, number, number]

/** Minimal exhibit shape needed for collision, so tests can pass a plain object. */
export interface ExhibitCollision {
  tier: Tier
  footprint?: Footprint | undefined
  position: { x: number; z: number; face: readonly [number, number] }
}

export const PLAYER_RADIUS = 0.35
export const SEG_CLEARANCE = 0.48

export function segDist(px: number, pz: number, s: Seg): number {
  const ax = s[0]
  const az = s[1]
  const bx = s[2]
  const bz = s[3]
  const dx = bx - ax
  const dz = bz - az
  const L2 = dx * dx + dz * dz || 1
  let t = ((px - ax) * dx + (pz - az) * dz) / L2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

export function buildCollisionSegments(building: Building): Seg[] {
  const segs: Seg[] = []
  for (const w of building.walls) {
    segs.push([w[0], w[1], w[2], w[3]])
  }
  for (const g of building.glass) {
    segs.push([g[0], g[1], g[2], g[3]])
  }
  return segs
}

/**
 * One collision segment per edge of each exhibit's footprint, rotated by the
 * exhibit's facing so visitors cannot walk through artifacts.
 */
export function buildExhibitSegments(exhibits: readonly ExhibitCollision[]): Seg[] {
  const segs: Seg[] = []
  for (const exhibit of exhibits) {
    const fp = footprintFor(exhibit)
    const cx = exhibit.position.x
    const cz = exhibit.position.z
    const yaw = Math.atan2(exhibit.position.face[0], exhibit.position.face[1])
    const cos = Math.cos(yaw)
    const sin = Math.sin(yaw)
    const hw = fp.w / 2
    const hd = fp.d / 2
    const corners: Array<[number, number]> = [
      [cx - hw * cos + hd * sin, cz - hw * sin - hd * cos],
      [cx + hw * cos + hd * sin, cz + hw * sin - hd * cos],
      [cx + hw * cos - hd * sin, cz + hw * sin + hd * cos],
      [cx - hw * cos - hd * sin, cz - hw * sin + hd * cos]
    ]
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!
      const b = corners[(i + 1) % 4]!
      segs.push([a[0], a[1], b[0], b[1]])
    }
  }
  return segs
}

/** Circular obstacles: planters, kiosk/benches, foyer desk, shop table. */
export function buildObstacles(building: Building): Circle[] {
  const circles: Circle[] = []
  circles.push([-2.16, 18.6, 0.9])

  const ar = building.ra - 0.96
  for (const a of [45, 135, 225, 315]) {
    const rad = (a * Math.PI) / 180
    circles.push([Math.cos(rad) * ar, Math.sin(rad) * ar, 0.6])
  }
  circles.push([0, 0, 1.92])

  const shop = building.rooms.find((r) => r.key === 'Shop')
  if (shop) {
    let cx = 0
    let cz = 0
    for (const p of shop.poly) {
      cx += p[0]
      cz += p[1]
    }
    const n = shop.poly.length || 1
    circles.push([cx / n + 0.12, cz / n + 0.72, 0.6])
  }
  return circles
}

export function blocked(
  x: number,
  z: number,
  segs: readonly Seg[],
  circles: readonly Circle[]
): boolean {
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (s && segDist(x, z, s) < SEG_CLEARANCE) return true
  }
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i]
    if (!c) continue
    if (Math.hypot(x - c[0], z - c[1]) < c[2] + PLAYER_RADIUS) return true
  }
  return false
}

/** Axis-separated sliding: try X then Z independently. */
export function slideMove(
  x: number,
  z: number,
  dx: number,
  dz: number,
  segs: readonly Seg[],
  circles: readonly Circle[]
): { x: number; z: number } {
  let nx = x
  let nz = z
  if (!blocked(x + dx, z, segs, circles)) nx = x + dx
  if (!blocked(nx, z + dz, segs, circles)) nz = z + dz
  return { x: nx, z: nz }
}
