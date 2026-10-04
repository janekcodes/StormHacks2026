import type { Building } from '@museum/content/plan-schema'
import { segDist, type Circle, type Seg } from '../player/collision'
import { inPoly } from '../rooms'

export interface BenchSpot {
  x: number
  z: number
  /** Yaw of the bench's long axis. */
  rotY: number
}

interface Point {
  x: number
  z: number
}

export interface BenchInputs {
  building: Building
  exhibits: readonly { position: { x: number; z: number } }[]
  /** Guided-travel stops (exhibit standpoints and room targets); benches keep clear of them. */
  stops: readonly Point[]
}

const GALLERIES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Sx', 'X'])

/** Clearances (m) a gallery bench keeps from everything a visitor walks to or along. */
export const BENCH_CLEAR = {
  exhibit: 2.3,
  stop: 1.6,
  wall: 1.3,
  door: 2.6,
  walkLine: 1.1
} as const

/** Collision radius of a gallery bench (1.8 m long). */
export const BENCH_RADIUS = 0.8

function minDist(p: Point, pts: readonly Point[]): number {
  let d = Infinity
  for (const q of pts) d = Math.min(d, Math.hypot(p.x - q.x, p.z - q.z))
  return d
}

function minSeg(p: Point, segs: readonly Seg[]): number {
  let d = Infinity
  for (const s of segs) d = Math.min(d, segDist(p.x, p.z, s))
  return d
}

/**
 * One bench per gallery at the most open point that clears exhibits, stops,
 * walls, doors and wayfinding lines. Galleries too full to fit one get none.
 * The bench's long side faces the nearest exhibit.
 */
export function galleryBenchSpots({ building, exhibits, stops }: BenchInputs): BenchSpot[] {
  const walls: Seg[] = [
    ...building.walls.map((w) => [w[0], w[1], w[2], w[3]] as const),
    ...building.glass.map((g) => [g[0], g[1], g[2], g[3]] as const)
  ]
  const doors: Point[] = building.lintels.map((l) => ({ x: (l[0] + l[2]) / 2, z: (l[1] + l[3]) / 2 }))
  const walk: Seg[] = building.dashes.map((d) => [d[0], d[1], d[2], d[3]] as const)
  const pieces: Point[] = exhibits.map((e) => e.position)
  const spots: BenchSpot[] = []

  for (const room of building.rooms) {
    if (!GALLERIES.has(room.key)) continue
    const xs = room.poly.map((p) => p[0])
    const zs = room.poly.map((p) => p[1])
    let best: { p: Point; score: number } | null = null
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.35) {
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 0.35) {
        if (!inPoly(x, z, room.poly)) continue
        const p = { x, z }
        const dEx = minDist(p, pieces)
        const dStop = minDist(p, stops)
        const dWall = minSeg(p, walls)
        const dDoor = minDist(p, doors)
        const dWalk = minSeg(p, walk)
        if (
          dEx < BENCH_CLEAR.exhibit ||
          dStop < BENCH_CLEAR.stop ||
          dWall < BENCH_CLEAR.wall ||
          dDoor < BENCH_CLEAR.door ||
          dWalk < BENCH_CLEAR.walkLine
        ) {
          continue
        }
        const score = Math.min(dEx, dStop + 0.5, dWall + 0.8, dWalk + 0.6)
        if (!best || score > best.score) best = { p, score }
      }
    }
    if (!best) continue
    let near: Point | null = null
    let nd = Infinity
    for (const e of pieces) {
      const d = Math.hypot(e.x - best.p.x, e.z - best.p.z)
      if (d < nd) {
        nd = d
        near = e
      }
    }
    const face = near ? Math.atan2(near.x - best.p.x, near.z - best.p.z) : 0
    spots.push({ x: best.p.x, z: best.p.z, rotY: face })
  }
  return spots
}

export function benchObstacles(spots: readonly BenchSpot[]): Circle[] {
  return spots.map((s) => [s.x, s.z, BENCH_RADIUS] as const)
}
