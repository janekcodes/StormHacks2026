import type { Building } from '@museum/content'
import type { Exhibit } from '@museum/content'
import { init, exportNavMesh, NavMeshQuery, type NavMesh } from '@recast-navigation/core'
import { threeToSoloNavMesh } from '@recast-navigation/three'
import * as THREE from 'three'

/** Agent and Recast settings (see docs/decisions/0004-navmesh.md). */
export const NAV_AGENT_RADIUS_M = 0.35
export const NAV_AGENT_HEIGHT_M = 1.7
export const NAV_MAX_CLIMB_M = 0
export const NAV_CS_M = 0.12
export const NAV_CH_M = 0.2
export const NAV_WALL_THICK_M = 0.3
export const NAV_GLASS_THICK_M = 0.08
export const NAV_WALKABLE_SLOPE_DEG = 45

export const NAV_CONFIG = {
  cs: NAV_CS_M,
  ch: NAV_CH_M,
  walkableRadius: Math.ceil(NAV_AGENT_RADIUS_M / NAV_CS_M),
  walkableHeight: Math.ceil(NAV_AGENT_HEIGHT_M / NAV_CH_M),
  walkableClimb: Math.ceil(NAV_MAX_CLIMB_M / NAV_CH_M),
  walkableSlopeAngle: NAV_WALKABLE_SLOPE_DEG
} as const

export interface NavPoint {
  x: number
  z: number
  yaw: number
}

export interface StandpointsFile {
  exhibits: Record<string, NavPoint>
  rooms: Record<string, NavPoint>
}

function dedupeRing(ring: readonly (readonly [number, number])[]): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (const p of ring) {
    const last = out[out.length - 1]
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-9) {
      out.push([p[0], p[1]])
    }
  }
  return out
}

/** Floor mesh from building outline in XZ, normals +Y. */
export function buildFloorMesh(outline: Building['outline']): THREE.Mesh {
  const shape = new THREE.Shape()
  const ring = dedupeRing(outline)
  ring.forEach((p, i) => {
    if (i === 0) shape.moveTo(p[0], p[1])
    else shape.lineTo(p[0], p[1])
  })
  shape.closePath()
  const geom = new THREE.ShapeGeometry(shape)
  // ShapeGeometry is XY; rotateX(-90) maps to X(-Z). Negate Z so plan +Z stays +Z.
  geom.rotateX(-Math.PI / 2)
  const position = geom.getAttribute('position')
  if (!(position instanceof THREE.BufferAttribute)) {
    throw new Error('floor mesh missing position attribute')
  }
  const arr = position.array
  for (let i = 2; i < arr.length; i += 3) {
    arr[i]! *= -1
  }
  const idx = geom.index
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1)
      idx.setX(i + 1, idx.getX(i + 2))
      idx.setX(i + 2, b)
    }
    idx.needsUpdate = true
  }
  position.needsUpdate = true
  geom.computeVertexNormals()
  return new THREE.Mesh(geom)
}

/** Vertical wall faces only (no tops) so Recast does not walk on them. */
export function wallQuadMesh(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  thick: number,
  height = 5
): THREE.Mesh {
  const dx = x2 - x1
  const dz = z2 - z1
  const L = Math.hypot(dx, dz) || 1
  const nx = (-dz / L) * (thick / 2)
  const nz = (dx / L) * (thick / 2)
  const positions = new Float32Array([
    x1 + nx,
    0,
    z1 + nz,
    x2 + nx,
    0,
    z2 + nz,
    x2 + nx,
    height,
    z2 + nz,
    x1 + nx,
    height,
    z1 + nz,
    x1 - nx,
    0,
    z1 - nz,
    x1 - nx,
    height,
    z1 - nz,
    x2 - nx,
    height,
    z2 - nz,
    x2 - nx,
    0,
    z2 - nz
  ])
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  return new THREE.Mesh(geom)
}

function openCylinderMesh(x: number, z: number, radius: number, height = 5, segments = 14): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(radius, radius, height, segments, 1, true)
  geom.translate(x, height / 2, z)
  return new THREE.Mesh(geom)
}

/** Fixed circular obstacles matching scene collision (planters, kiosk, desk). */
export function obstacleMeshes(building: Building): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  meshes.push(openCylinderMesh(-2.16, 18.6, 0.9))
  const ar = building.ra - 0.96
  for (const a of [45, 135, 225, 315]) {
    const rad = (a * Math.PI) / 180
    meshes.push(openCylinderMesh(Math.cos(rad) * ar, Math.sin(rad) * ar, 0.6))
  }
  meshes.push(openCylinderMesh(0, 0, 1.92))
  const shop = building.rooms.find((r) => r.key === 'Shop')
  if (shop) {
    let cx = 0
    let cz = 0
    for (const p of shop.poly) {
      cx += p[0]
      cz += p[1]
    }
    const n = shop.poly.length || 1
    meshes.push(openCylinderMesh(cx / n + 0.12, cz / n + 0.72, 0.6))
  }
  return meshes
}

export function buildNavMeshes(building: Building): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [buildFloorMesh(building.outline)]
  for (const w of building.walls) {
    if (Math.hypot(w[2] - w[0], w[3] - w[1]) < 1e-6) continue
    meshes.push(wallQuadMesh(w[0], w[1], w[2], w[3], NAV_WALL_THICK_M))
  }
  for (const g of building.glass) {
    if (Math.hypot(g[2] - g[0], g[3] - g[1]) < 1e-6) continue
    meshes.push(wallQuadMesh(g[0], g[1], g[2], g[3], NAV_GLASS_THICK_M))
  }
  meshes.push(...obstacleMeshes(building))
  return meshes
}

let initPromise: Promise<void> | null = null

export function ensureRecastInit(): Promise<void> {
  if (!initPromise) initPromise = init()
  return initPromise
}

export interface BuiltNavmesh {
  navMesh: NavMesh
  bytes: Uint8Array
  query: NavMeshQuery
}

export async function buildNavmesh(building: Building): Promise<BuiltNavmesh> {
  await ensureRecastInit()
  const meshes = buildNavMeshes(building)
  const result = threeToSoloNavMesh(meshes, { ...NAV_CONFIG })
  if (!result.success || !result.navMesh) {
    throw new Error(`navmesh generation failed: ${result.error ?? 'unknown'}`)
  }
  const bytes = exportNavMesh(result.navMesh)
  const query = new NavMeshQuery(result.navMesh)
  query.defaultQueryHalfExtents = { x: 2, y: 2, z: 2 }
  return { navMesh: result.navMesh, bytes, query }
}

function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ))
}

function yawAlong(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz)
}

function snapPoint(
  query: NavMeshQuery,
  x: number,
  z: number,
  half = 1.5
): { x: number; z: number } | null {
  const c = query.findClosestPoint(
    { x, y: 0, z },
    { halfExtents: { x: half, y: 2, z: half } }
  )
  if (!c.success) return null
  return { x: c.point.x, z: c.point.z }
}

/** Nearest navmesh point 1.6–2.8 m in front of the exhibit along `face`. */
export function standPointForExhibit(query: NavMeshQuery, exhibit: Exhibit): NavPoint {
  const [fx, fz] = exhibit.position.face
  let best: { x: number; z: number } | null = null
  for (let d = 2.8; d >= 1.6 - 1e-9; d -= 0.3) {
    const x = exhibit.position.x + fx * d
    const z = exhibit.position.z + fz * d
    const snapped = snapPoint(query, x, z, 1.2)
    if (!snapped) continue
    const c = query.findClosestPoint(
      { x, y: 0, z },
      { halfExtents: { x: 1.2, y: 2, z: 1.2 } }
    )
    best = snapped
    if (c.success && c.isPointOverPoly) break
  }
  if (!best) {
    const fallback = snapPoint(
      query,
      exhibit.position.x + fx * 2.2,
      exhibit.position.z + fz * 2.2,
      3
    )
    if (!fallback) {
      throw new Error(`no stand point on navmesh for ${exhibit.id}`)
    }
    best = fallback
  }
  return {
    x: round3(best.x),
    z: round3(best.z),
    yaw: round3(yawToward(best.x, best.z, exhibit.position.x, exhibit.position.z))
  }
}

function round3(n: number): number {
  const r = Math.round(n * 1000) / 1000
  return Object.is(r, -0) ? 0 : r
}

function roomCentroid(room: Building['rooms'][number]): [number, number] {
  let x = 0
  let z = 0
  for (const p of room.poly) {
    x += p[0]
    z += p[1]
  }
  const n = room.poly.length || 1
  return [x / n, z / n]
}

/**
 * One entry point per room: 2–4 m inside the wing door facing outward,
 * with fixed targets for foyer / atrium / concourse / alcoves.
 */
export function roomTargetFor(
  query: NavMeshQuery,
  building: Building,
  key: string
): NavPoint {
  if (key === 'Foyer') {
    const p = snapPoint(query, 0, 20.7, 2) ?? { x: 0, z: 20.7 }
    return { x: round3(p.x), z: round3(p.z), yaw: 0 }
  }
  if (key === 'Atr') {
    const p = snapPoint(query, 0, 4.2, 2) ?? { x: 0, z: 4.2 }
    return { x: round3(p.x), z: round3(p.z), yaw: 0 }
  }
  if (key === 'Conc') {
    // Midway across the ring (apothems of the atrium and concourse octagons), so it is not in the atrium.
    const r = ((building.ra + building.rc) / 2) * Math.cos(Math.PI / 8)
    const p = snapPoint(query, 0, r, 2) ?? { x: 0, z: r }
    return { x: round3(p.x), z: round3(p.z), yaw: Math.PI }
  }
  // Sx and X split the SE sector along the 45 deg line, where the Sx sign sits.
  // Aim at the middle of each half instead so the target lands in its own room.
  if (key === 'Sx' || key === 'X') {
    const a = ((key === 'Sx' ? 33.75 : 56.25) * Math.PI) / 180
    const [ux, uz] = [Math.cos(a), Math.sin(a)]
    const d = building.rc + 2.5
    const p = snapPoint(query, ux * d, uz * d, 1.5) ?? { x: ux * d, z: uz * d }
    return { x: round3(p.x), z: round3(p.z), yaw: round3(yawAlong(ux, uz)) }
  }

  const sign = building.signs.find((s) => s.k === key)
  if (sign) {
    const [ux, uz] = sign.u
    let found: { x: number; z: number } | null = null
    outer: for (const d of [2.2, 3.0, 3.8, 1.6, 4.0]) {
      for (const lat of [0, 1.6, -1.6, 3, -3]) {
        const x = sign.p[0] + ux * d - uz * lat
        const z = sign.p[1] + uz * d + ux * lat
        const snapped = snapPoint(query, x, z, 1.2)
        if (!snapped) continue
        const c = query.findClosestPoint(
          { x, y: 0, z },
          { halfExtents: { x: 1.2, y: 2, z: 1.2 } }
        )
        if (c.success && c.isPointOverPoly) {
          found = snapped
          break outer
        }
        if (!found) found = snapped
      }
    }
    if (!found) throw new Error(`no room target on navmesh for ${key}`)
    return {
      x: round3(found.x),
      z: round3(found.z),
      yaw: round3(yawAlong(ux, uz))
    }
  }

  if (key === 'G') {
    const p = snapPoint(query, -4.5, 13.5, 2) ?? { x: -4.5, z: 13.5 }
    return { x: round3(p.x), z: round3(p.z), yaw: round3(Math.PI / 2) }
  }
  if (key === 'Shop') {
    const room = building.rooms.find((r) => r.key === 'Shop')
    if (!room) throw new Error('Shop room missing')
    const [cx, cz] = roomCentroid(room)
    const p = snapPoint(query, cx, cz + 1.2, 2) ?? { x: cx, z: cz }
    return { x: round3(p.x), z: round3(p.z), yaw: round3(-Math.PI / 2) }
  }

  const room = building.rooms.find((r) => r.key === key)
  if (!room) throw new Error(`unknown room ${key}`)
  const [cx, cz] = roomCentroid(room)
  const p = snapPoint(query, cx, cz, 3)
  if (!p) throw new Error(`no room target on navmesh for ${key}`)
  return { x: round3(p.x), z: round3(p.z), yaw: round3(yawToward(p.x, p.z, 0, 0)) }
}

export function buildStandpoints(
  query: NavMeshQuery,
  building: Building,
  exhibits: readonly Exhibit[]
): StandpointsFile {
  const exhibitPoints: Record<string, NavPoint> = {}
  for (const e of exhibits) {
    exhibitPoints[e.id] = standPointForExhibit(query, e)
  }
  const rooms: Record<string, NavPoint> = {}
  for (const room of building.rooms) {
    rooms[room.key] = roomTargetFor(query, building, room.key)
  }
  return { exhibits: exhibitPoints, rooms }
}

export function pathExists(
  query: NavMeshQuery,
  from: { x: number; z: number },
  to: { x: number; z: number }
): boolean {
  const a = snapPoint(query, from.x, from.z, 2)
  const b = snapPoint(query, to.x, to.z, 2)
  if (!a || !b) return false
  const path = query.computePath({ x: a.x, y: 0, z: a.z }, { x: b.x, y: 0, z: b.z })
  return Boolean(path.success && path.path && path.path.length > 0)
}

export function computePathPoints(
  query: NavMeshQuery,
  from: { x: number; z: number },
  to: { x: number; z: number }
): Array<{ x: number; z: number }> {
  const a = snapPoint(query, from.x, from.z, 2)
  const b = snapPoint(query, to.x, to.z, 2)
  if (!a || !b) return []
  const path = query.computePath({ x: a.x, y: 0, z: a.z }, { x: b.x, y: 0, z: b.z })
  if (!path.success || !path.path) return []
  return path.path.map((p) => ({ x: p.x, z: p.z }))
}
