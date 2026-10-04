import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { BuildingSchema } from '@museum/content/plan-schema'
import { ExhibitsFileSchema } from '@museum/content/schema'
import { roomAt } from '../rooms'
import { museum, setMapBuilding } from './api'
import { setStandpoints, type StandpointsData } from './targets'
import { TRAVEL_SPEED_M_S, FACE_BLEND_M, cancelTravel, isTravelling } from './travel'
import {
  disposeNav,
  findPath,
  findWalkableNavPoint,
  loadNavMesh
} from './useNav'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const building = BuildingSchema.parse(
  JSON.parse(readFileSync(join(root, 'packages/content/generated/building.json'), 'utf8'))
)
const standpoints = JSON.parse(
  readFileSync(join(root, 'packages/content/generated/standpoints.json'), 'utf8')
) as StandpointsData
const exhibits = ExhibitsFileSchema.parse(
  JSON.parse(readFileSync(join(root, 'packages/content/data/exhibits.json'), 'utf8'))
).exhibits
const navBytes = readFileSync(join(root, 'packages/content/generated/navmesh.bin'))

describe('nav', () => {
  beforeAll(async () => {
    await loadNavMesh(navBytes)
    setStandpoints(standpoints)
    setMapBuilding(building)
  })

  afterAll(() => {
    disposeNav()
    setMapBuilding(null)
    cancelTravel()
  })

  it('exposes travel constants from the plan', () => {
    expect(TRAVEL_SPEED_M_S).toBe(8)
    expect(FACE_BLEND_M).toBe(1.5)
  })

  it('has a path from the foyer to every stand point and room target', () => {
    const foyer = { x: 0, z: 20.7 }
    expect(Object.keys(standpoints.exhibits)).toHaveLength(77)
    expect(Object.keys(standpoints.rooms)).toHaveLength(13)
    for (const [id, sp] of Object.entries(standpoints.exhibits)) {
      const path = findPath(foyer, sp)
      expect(path, `path to ${id}`).not.toBeNull()
      expect(path!.points.length).toBeGreaterThan(0)
    }
    for (const [key, rt] of Object.entries(standpoints.rooms)) {
      const path = findPath(foyer, rt)
      expect(path, `path to room ${key}`).not.toBeNull()
    }
  })

  it('puts every Navigate room target inside its own room', () => {
    for (const [key, rt] of Object.entries(standpoints.rooms)) {
      expect(roomAt(building, rt.x, rt.z)?.key, `room target ${key} at (${rt.x}, ${rt.z})`).toBe(key)
    }
  })

  it('rejects minimap clicks inside walls or outside the building', () => {
    // Far outside
    expect(museum.goMapPoint(200, 200)).toBe(false)
    expect(findWalkableNavPoint(200, 200)).toBeNull()
    // Centre of a thick exterior wall sample: north outline tip is walkable;
    // pick a point clearly outside the outline.
    expect(roomAt(building, 0, 50)).toBeNull()
    expect(museum.goMapPoint(0, 50)).toBe(false)
    // On a wall segment midpoint (interior wall near concourse) should not be walkable.
    const wall = building.walls.find(
      (w) => Math.hypot(w[2] - w[0], w[3] - w[1]) > 2 && w[4] === 'int'
    )
    expect(wall).toBeTruthy()
    const mx = (wall![0] + wall![2]) / 2
    const mz = (wall![1] + wall![3]) / 2
    expect(findWalkableNavPoint(mx, mz, 0.4)).toBeNull()
    expect(museum.goMapPoint(mx, mz)).toBe(false)
  })

  it('walkTo and goRoom resolve precomputed targets', () => {
    const id = exhibits[0]!.id
    expect(museum.walkTo(id)).toBe(true)
    expect(isTravelling()).toBe(true)
    cancelTravel()
    expect(isTravelling()).toBe(false)
    expect(museum.goRoom('Atr')).toBe(true)
    cancelTravel()
  })

  it('does not include a fade-teleport code path', () => {
    const travelSrc = readFileSync(
      join(root, 'packages/scene/src/nav/travel.ts'),
      'utf8'
    )
    expect(travelSrc).not.toMatch(/setTimeout/)
    expect(travelSrc).not.toMatch(/opacity/)
    expect(travelSrc).toMatch(/findPath/)
    expect(TRAVEL_SPEED_M_S).toBe(8)
  })
})
