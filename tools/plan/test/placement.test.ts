import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PlanInputSchema } from '@museum/content'
import { generate } from '../src/generate'

type Pt = [number, number]

const root = fileURLToPath(new URL('../../..', import.meta.url))
const plan = PlanInputSchema.parse(
  JSON.parse(readFileSync(join(root, 'packages/content/data/plan.json'), 'utf8'))
)
const building = generate(plan)

interface ExhibitPos {
  id: string
  zone: string
  x: number
  z: number
}

const raw = JSON.parse(
  readFileSync(join(root, 'packages/content/data/exhibits.json'), 'utf8')
) as { exhibits: Array<{ id: string; zone: string; position: { x: number; z: number } }> }

const exhibits: ExhibitPos[] = raw.exhibits.map((e) => ({
  id: e.id,
  zone: e.zone,
  x: e.position.x,
  z: e.position.z
}))

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]![0]
    const yi = poly[i]![1]
    const xj = poly[j]![0]
    const yj = poly[j]![1]
    const crosses = (yi > p[1]) !== (yj > p[1])
    if (crosses && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const len2 = abx * abx + aby * aby
  if (len2 < 1e-12) return dist(p, a)
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2
  t = Math.max(0, Math.min(1, t))
  return dist(p, [a[0] + t * abx, a[1] + t * aby])
}

const ZONE_TO_ROOM: Record<string, string> = { P: 'Atr', S: 'Sx' }
const roomByKey = new Map(building.rooms.map((r) => [r.key, r]))
const wallSegments: Array<[Pt, Pt]> = building.walls
  .filter(([x1, z1, x2, z2]) => dist([x1, z1], [x2, z2]) > 1e-9)
  .map(([x1, z1, x2, z2]) => [[x1, z1], [x2, z2]] as [Pt, Pt])

describe('exhibit placement validation', () => {
  it('imports all 77 exhibits', () => {
    expect(exhibits.length).toBe(77)
  })

  it('places every exhibit inside its zone room polygon', () => {
    for (const e of exhibits) {
      const roomKey = ZONE_TO_ROOM[e.zone] ?? e.zone
      const room = roomByKey.get(roomKey)
      expect(room, `${e.id} zone ${e.zone} -> room ${roomKey}`).toBeDefined()
      const inside = pointInPolygon([e.x, e.z], (room as { poly: Pt[] }).poly)
      expect(inside, `${e.id} (${e.x}, ${e.z}) outside ${roomKey}`).toBe(true)
    }
  })

  it('keeps every exhibit at least 0.5 m from every wall', () => {
    for (const e of exhibits) {
      let minD = Infinity
      for (const [a, b] of wallSegments) {
        minD = Math.min(minD, pointSegDist([e.x, e.z], a, b))
      }
      expect(minD, `${e.id} is ${minD.toFixed(3)} m from a wall`).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('keeps exhibits at least 2.4 m apart', () => {
    let minPair = Infinity
    for (let i = 0; i < exhibits.length; i++) {
      for (let j = i + 1; j < exhibits.length; j++) {
        const d = dist([exhibits[i]!.x, exhibits[i]!.z], [exhibits[j]!.x, exhibits[j]!.z])
        if (d < minPair) minPair = d
      }
    }
    expect(minPair).toBeGreaterThanOrEqual(2.4)
  })
})
