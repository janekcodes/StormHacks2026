import polygonClipping from 'polygon-clipping'
import type { PlanInput } from '@museum/content'

export type Pt = [number, number]
export type Ring = Pt[]

export const DEG = Math.PI / 180

// Reach used for the oversized wedge / half-plane clip polygons.
export const FAR = 400

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function roundPt(p: Pt): Pt {
  return [round3(p[0]), round3(p[1])]
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

export function dirOf(angleDeg: number): Pt {
  const r = angleDeg * DEG
  return [Math.cos(r), Math.sin(r)]
}

export function pointAtRadius(angleDeg: number, r: number): Pt {
  const d = dirOf(angleDeg)
  return [d[0] * r, d[1] * r]
}

export function at(p0: Pt, dir: Pt, t: number): Pt {
  return [p0[0] + dir[0] * t, p0[1] + dir[1] * t]
}

// Atrium and concourse octagons share vertices at 22.5 + 45k degrees.
export function octagon(r: number): Ring {
  const pts: Ring = []
  for (let k = 0; k < 8; k++) pts.push(roundPt(pointAtRadius(22.5 + 45 * k, r)))
  return pts
}

// 9 authored outline points + 25 bulge points + 5 tail points = 39 points.
export function buildOutline(plan: PlanInput): Ring {
  const scale = plan.scale
  const toMetres = (px: [number, number]): Pt =>
    roundPt([(px[0] - plan.origin[0]) * scale, (px[1] - plan.origin[1]) * scale])

  const ring: Ring = []
  for (const p of plan.outline) ring.push(toMetres([p[0], p[1]]))

  const b = plan.bulge
  const n = b.count
  // Emitted i = count-1 down to 0, so the bulge runs east to west and its
  // first point repeats the authored [1160, 1040], its last [840, 1040].
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1)
    const x = b.toX + (b.fromX - b.toX) * t
    const y = b.baseY + b.amplitude * Math.sin(Math.PI * t)
    ring.push(toMetres([x, y]))
  }

  for (const p of plan.outlineTail) ring.push(toMetres([p[0], p[1]]))
  return ring
}

// Drop consecutive duplicate points (the two bulge repeats). Keeps the ring open.
export function dedupe(ring: Ring): Ring {
  const out: Ring = []
  for (const p of ring) {
    const last = out[out.length - 1]
    if (!last || dist(last, p) > 1e-9) out.push(p)
  }
  return out
}

// First crossing of the ray from the origin at angleDeg with the ring.
export function rayIntersectRing(angleDeg: number, ring: Ring): Pt {
  const dir = dirOf(angleDeg)
  let bestT = Infinity
  let best: Pt | null = null
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Pt
    const b = ring[(i + 1) % ring.length] as Pt
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const denom = dir[0] * dy - dir[1] * dx
    if (Math.abs(denom) < 1e-12) continue
    const t = (a[0] * dy - a[1] * dx) / denom
    if (t < 1e-9) continue
    const s = (a[0] * dir[1] - a[1] * dir[0]) / denom
    if (s < -1e-9 || s > 1 + 1e-9) continue
    if (t < bestT) {
      bestT = t
      best = [dir[0] * t, dir[1] * t]
    }
  }
  if (!best) throw new Error(`ray at ${angleDeg} did not hit ring`)
  return roundPt(best)
}

export interface DoorSpec {
  width: number
  fractions: number[]
}

// Cut a wall into runs separated by door gaps; return the runs and the lintels
// (one per gap, endpoints ordered from the `a` end).
export function splitWall(
  a: Pt,
  b: Pt,
  door: DoorSpec
): { segments: Array<[Pt, Pt]>; lintels: Array<[Pt, Pt]> } {
  const segments: Array<[Pt, Pt]> = []
  const lintels: Array<[Pt, Pt]> = []
  const len = dist(a, b)
  const dir: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  const half = door.width / 2
  const sorted = [...door.fractions].sort((x, y) => x - y)
  let start = 0
  for (const f of sorted) {
    const c = f * len
    const gs = c - half
    const ge = c + half
    if (gs > start + 1e-9) {
      segments.push([roundPt(at(a, dir, start)), roundPt(at(a, dir, gs))])
    }
    lintels.push([roundPt(at(a, dir, gs)), roundPt(at(a, dir, ge))])
    start = ge
  }
  if (start < len - 1e-9) {
    segments.push([roundPt(at(a, dir, start)), roundPt(at(a, dir, len))])
  }
  return { segments, lintels }
}

function firstRing(multi: polygonClipping.MultiPolygon): Ring | null {
  if (multi.length === 0) return null
  const poly = multi[0]
  if (!poly || poly.length === 0) return null
  return poly[0] as Ring
}

export function intersect(subject: Ring, ...clips: Ring[]): Ring | null {
  const res = polygonClipping.intersection([subject], ...clips.map((c) => [c]))
  return firstRing(res)
}

export function difference(subject: Ring, ...clips: Ring[]): Ring | null {
  const res = polygonClipping.difference([subject], ...clips.map((c) => [c]))
  return firstRing(res)
}

// An oversized polygon covering the half-plane { p · dir(angleDeg) >= offset }.
export function halfPlane(angleDeg: number, offset: number, far: number): Ring {
  const u = dirOf(angleDeg)
  const v: Pt = [-u[1], u[0]]
  const p0: Pt = [u[0] * offset, u[1] * offset]
  return [
    [p0[0] - far * v[0], p0[1] - far * v[1]],
    [far * u[0] - far * v[0], far * u[1] - far * v[1]],
    [far * u[0] + far * v[0], far * u[1] + far * v[1]],
    [p0[0] + far * v[0], p0[1] + far * v[1]]
  ]
}

// A room: building ∩ wedge(centre ± half) ∩ { p · dir(centre) >= innerEdge }.
export function sectorRoom(
  angleDeg: number,
  halfDeg: number,
  building: Ring,
  innerEdge: number,
  far: number
): Ring {
  const wedge: Ring = [
    [0, 0],
    pointAtRadius(angleDeg - halfDeg, far),
    pointAtRadius(angleDeg + halfDeg, far)
  ]
  const room = intersect(wedge, building, halfPlane(angleDeg, innerEdge, far))
  if (!room) throw new Error(`empty sector at ${angleDeg}`)
  return room
}

// Clip a ring to an axis-aligned box.
export function clipBox(ring: Ring, xmin: number, xmax: number, zmin: number, zmax: number): Ring | null {
  const box: Ring = [
    [xmin, zmin],
    [xmax, zmin],
    [xmax, zmax],
    [xmin, zmax]
  ]
  return intersect(ring, box)
}

export interface SpanResult {
  tmin: number
  tmax: number
  edgeMin: Pt // unit direction of the edge hit at tmin
  edgeMax: Pt // unit direction of the edge hit at tmax
}

// Intersect the line p0 + t*dir with a ring; return the span inside the ring
// plus the direction of the edge crossed at each end.
export function lineRingSpan(p0: Pt, dir: Pt, ring: Ring): SpanResult | null {
  let tmin = Infinity
  let tmax = -Infinity
  let edgeMin: Pt = [0, 0]
  let edgeMax: Pt = [0, 0]
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as Pt
    const b = ring[(i + 1) % ring.length] as Pt
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy)
    if (len < 1e-12) continue
    const denom = dir[0] * dy - dir[1] * dx
    if (Math.abs(denom) < 1e-12) continue
    const t = ((a[0] - p0[0]) * dy - (a[1] - p0[1]) * dx) / denom
    const s = ((a[0] - p0[0]) * dir[1] - (a[1] - p0[1]) * dir[0]) / denom
    if (s < -1e-9 || s > 1 + 1e-9) continue
    const eu: Pt = [dx / len, dy / len]
    if (t < tmin) {
      tmin = t
      edgeMin = eu
    }
    if (t > tmax) {
      tmax = t
      edgeMax = eu
    }
  }
  if (!Number.isFinite(tmin) || !Number.isFinite(tmax)) return null
  return { tmin, tmax, edgeMin, edgeMax }
}
