import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BuildingSchema,
  ExhibitsFileSchema,
  PlanInputSchema
} from '@museum/content'
import { generate } from '../src/generate'
import {
  buildNavmesh,
  buildStandpoints,
  computePathPoints,
  pathExists,
  NAV_CONFIG
} from '../src/navmesh'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const plan = PlanInputSchema.parse(
  JSON.parse(readFileSync(join(root, 'packages/content/data/plan.json'), 'utf8'))
)
const exhibits = ExhibitsFileSchema.parse(
  JSON.parse(readFileSync(join(root, 'packages/content/data/exhibits.json'), 'utf8'))
).exhibits
const building = BuildingSchema.parse(generate(plan))

const FOYER = { x: 0, z: 34.5 }

function segDist(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1
  const dz = z2 - z1
  const L2 = dx * dx + dz * dz || 1
  let t = ((px - x1) * dx + (pz - z1) * dz) / L2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz))
}

/** True if the open segment a→b crosses a wall segment (not merely near an endpoint). */
function crossesWall(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  walls: typeof building.walls
): boolean {
  for (const w of walls) {
    const [x1, z1, x2, z2] = w
    if (Math.hypot(x2 - x1, z2 - z1) < 1e-9) continue
    // Proper segment intersection
    const d = (bx - ax) * (z2 - z1) - (bz - az) * (x2 - x1)
    if (Math.abs(d) < 1e-12) continue
    const t = ((x1 - ax) * (z2 - z1) - (z1 - az) * (x2 - x1)) / d
    const u = ((x1 - ax) * (bz - az) - (z1 - az) * (bx - ax)) / d
    if (t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98) return true
  }
  return false
}

describe('navmesh generation', () => {
  it('uses the blueprint agent settings', () => {
    expect(NAV_CONFIG.walkableRadius).toBe(Math.ceil(0.35 / NAV_CONFIG.cs))
    expect(NAV_CONFIG.walkableHeight).toBe(Math.ceil(1.7 / NAV_CONFIG.ch))
    expect(NAV_CONFIG.walkableClimb).toBe(0)
  })

  it('builds a navmesh with paths to every stand point and room target', async () => {
    const { query, bytes } = await buildNavmesh(building)
    expect(bytes.byteLength).toBeGreaterThan(1000)

    const standpoints = buildStandpoints(query, building, exhibits)
    expect(Object.keys(standpoints.exhibits)).toHaveLength(77)
    expect(Object.keys(standpoints.rooms)).toHaveLength(13)

    for (const [id, sp] of Object.entries(standpoints.exhibits)) {
      expect(pathExists(query, FOYER, sp), `path to exhibit ${id}`).toBe(true)
    }
    for (const [key, rt] of Object.entries(standpoints.rooms)) {
      expect(pathExists(query, FOYER, rt), `path to room ${key}`).toBe(true)
    }

    // No path segment properly intersects a wall centreline.
    for (const [id, sp] of Object.entries(standpoints.exhibits)) {
      const pts = computePathPoints(query, FOYER, sp)
      expect(pts.length, `points for ${id}`).toBeGreaterThan(0)
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!
        const b = pts[i]!
        expect(
          crossesWall(a.x, a.z, b.x, b.z, building.walls),
          `wall cross on way to ${id}`
        ).toBe(false)
      }
    }

    // Farthest exhibit under 15 s at 8 m/s.
    let maxLen = 0
    for (const sp of Object.values(standpoints.exhibits)) {
      const pts = computePathPoints(query, FOYER, sp)
      let len = 0
      for (let i = 1; i < pts.length; i++) {
        len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z)
      }
      maxLen = Math.max(maxLen, len)
    }
    expect(maxLen / 8).toBeLessThan(15)

    // Path points stay clear of wall centre lines (agent clearance).
    for (const sp of Object.values(standpoints.exhibits)) {
      const pts = computePathPoints(query, FOYER, sp)
      for (const p of pts) {
        for (const w of building.walls) {
          if (Math.hypot(w[2] - w[0], w[3] - w[1]) < 1e-9) continue
          expect(segDist(p.x, p.z, w[0], w[1], w[2], w[3])).toBeGreaterThan(0.2)
        }
      }
    }
  }, 60_000)

  it('committed navmesh.bin and standpoints.json are not stale', async () => {
    const { bytes, query } = await buildNavmesh(building)
    const standpoints = buildStandpoints(query, building, exhibits)

    const committedBin = readFileSync(join(root, 'packages/content/generated/navmesh.bin'))
    expect(Buffer.from(bytes).equals(committedBin)).toBe(true)

    const committedJson = JSON.parse(
      readFileSync(join(root, 'packages/content/generated/standpoints.json'), 'utf8')
    ) as typeof standpoints
    expect(committedJson).toEqual(standpoints)
  }, 60_000)
})
