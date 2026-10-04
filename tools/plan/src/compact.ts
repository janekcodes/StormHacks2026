// One-time compaction of the museum: plan 17 layout pass.
//
// Plan 16 shipped a full-scale museum (98 m × 69 m) with exhibits spread over
// 89 m × 59 m. This script shrinks the layout to ~59 m × 41 m by scaling the
// plan scale 0.07 -> 0.042 (× 0.6) and re-placing the 77 exhibits with the
// same radial structure, then re-spacing any "row" (a connected run of
// exhibits that fell below the 2.4 m minimum) along its own axis and
// regenerating the golden reference (seed/plan.reference.json).
//
// Run from the repo root: pnpm --filter @museum/plan exec tsx src/compact.ts

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BuildingSchema,
  ExhibitsFileSchema,
  PlanInputSchema,
  type Building
} from '@museum/content'
import { generate } from './generate'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const planPath = join(root, 'packages/content/data/plan.json')
const exhibitsPath = join(root, 'packages/content/data/exhibits.json')
const referencePath = join(root, 'seed/plan.reference.json')

const SCALE = 0.6
const MIN_SPACING = 2.4
// Spread rows slightly wider than the minimum so 3-decimal rounding cannot
// push a pair back below 2.4 m.
const SPREAD_GAP = 2.45
const WALL_MARGIN = 0.5

type Pt = [number, number]

const plan = PlanInputSchema.parse(JSON.parse(readFileSync(planPath, 'utf8')))
const building = BuildingSchema.parse(generate(plan))
const file = ExhibitsFileSchema.parse(JSON.parse(readFileSync(exhibitsPath, 'utf8')))

const ZONE_TO_ROOM: Record<string, string> = { P: 'Atr', S: 'Sx' }
const roomByKey = new Map(building.rooms.map((r) => [r.key, r]))

function pointInPoly(p: Pt, poly: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]![0]
    const yi = poly[i]![1]
    const xj = poly[j]![0]
    const yj = poly[j]![1]
    const crosses = yi > p[1] !== yj > p[1]
    if (crosses && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const len2 = abx * abx + aby * aby
  if (len2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * abx), p[1] - (a[1] + t * aby))
}

const wallSegments: Array<[Pt, Pt]> = building.walls
  .filter(([x1, z1, x2, z2]) => Math.hypot(x2 - x1, z2 - z1) > 1e-9)
  .map(([x1, z1, x2, z2]) => [[x1, z1], [x2, z2]] as [Pt, Pt])

function minWallDist(p: Pt): number {
  let min = Infinity
  for (const [a, b] of wallSegments) min = Math.min(min, pointSegDist(p, a, b))
  return min
}

function roomFor(zone: string): Building['rooms'][number] | undefined {
  return roomByKey.get(ZONE_TO_ROOM[zone] ?? zone)
}

// ---- 1. scale positions ----------------------------------------------------
const points = new Map<string, Pt>()
for (const e of file.exhibits) {
  points.set(e.id, [e.position.x * SCALE, e.position.z * SCALE])
}

// ---- 2. find connected "rows" of exhibits below MIN_SPACING ---------------
const ids = file.exhibits.map((e) => e.id)
const parent = new Map<string, string>(ids.map((id) => [id, id]))
const find = (x: string): string => {
  while (parent.get(x) !== x) x = parent.get(x)!
  return x
}
const union = (a: string, b: string) => {
  const ra = find(a)
  const rb = find(b)
  if (ra !== rb) parent.set(ra, rb)
}

for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = points.get(ids[i] as string)!
    const b = points.get(ids[j] as string)!
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < MIN_SPACING) union(ids[i] as string, ids[j] as string)
  }
}

const components = new Map<string, string[]>()
for (const id of ids) {
  const root = find(id)
  const list = components.get(root) ?? []
  list.push(id)
  components.set(root, list)
}

// ---- 3. spread each row along its own principal axis -----------------------
for (const row of components.values()) {
  if (row.length < 2) continue
  // Principal axis: the two farthest exhibits define the dominant direction.
  let farA = row[0]!
  let farB = row[1]!
  let farD = -1
  for (let i = 0; i < row.length; i++) {
    for (let j = i + 1; j < row.length; j++) {
      const a = points.get(row[i] as string)!
      const b = points.get(row[j] as string)!
      const d = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (d > farD) {
        farD = d
        farA = row[i] as string
        farB = row[j] as string
      }
    }
  }
  const pa = points.get(farA)!
  const pb = points.get(farB)!
  let ux = pb[0] - pa[0]
  let uz = pb[1] - pa[1]
  const ul = Math.hypot(ux, uz) || 1
  ux /= ul
  uz /= ul

  // Project each exhibit onto the axis.
  const projected = row.map((id) => {
    const p = points.get(id)!
    return { id, t: p[0] * ux + p[1] * uz, p }
  })
  projected.sort((a, b) => a.t - b.t)

  // Centre the run and space it SPREAD_GAP apart along the axis.
  const n = projected.length
  const mid = (projected[0]!.t + projected[n - 1]!.t) / 2
  projected.forEach((item, k) => {
    const tNew = mid + (k - (n - 1) / 2) * SPREAD_GAP
    const perp = item.p
    const proj = item.t
    const dx = (tNew - proj) * ux
    const dz = (tNew - proj) * uz
    points.set(item.id, [perp[0] + dx, perp[1] + dz])
  })
}

// ---- 4. recompute facing ----------------------------------------------------
const round3 = (n: number) => Math.round(n * 1000) / 1000
const round4 = (n: number) => Math.round(n * 10000) / 10000

for (const e of file.exhibits) {
  const [x, z] = points.get(e.id)!
  e.position.x = round3(x)
  e.position.z = round3(z)
  if (e.zone === 'G') {
    e.position.face = [1, 0]
  } else {
    const r = Math.hypot(x, z) || 1
    e.position.face = [round4(-x / r), round4(-z / r)]
  }
}

// ---- 5. report and validate ------------------------------------------------
let minPair = Infinity
let worstLabel = ''
for (let i = 0; i < file.exhibits.length; i++) {
  for (let j = i + 1; j < file.exhibits.length; j++) {
    const a = file.exhibits[i]!
    const b = file.exhibits[j]!
    const d = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z)
    if (d < minPair) {
      minPair = d
      worstLabel = `${a.id}-${b.id}`
    }
  }
}
console.log(`min spacing after compaction: ${minPair.toFixed(3)} m (${worstLabel})`)

for (const e of file.exhibits) {
  const room = roomFor(e.zone)
  if (!room) throw new Error(`no room for ${e.id} (${e.zone})`)
  if (!pointInPoly([e.position.x, e.position.z], room.poly)) {
    throw new Error(`${e.id} outside room ${room.key}`)
  }
  const wall = minWallDist([e.position.x, e.position.z])
  if (wall < WALL_MARGIN) {
    throw new Error(`${e.id} is ${wall.toFixed(3)} m from a wall (need ${WALL_MARGIN})`)
  }
}

writeFileSync(exhibitsPath, JSON.stringify(file, null, 2) + '\n')
writeFileSync(referencePath, JSON.stringify(building, null, 2) + '\n')
console.log(`wrote ${exhibitsPath} (${file.exhibits.length} exhibits)`)
console.log(`wrote ${referencePath} (ra=${building.ra}, rc=${building.rc})`)
