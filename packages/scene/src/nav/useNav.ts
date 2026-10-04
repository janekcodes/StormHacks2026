'use client'

import { init, importNavMesh, NavMeshQuery, type NavMesh } from '@recast-navigation/core'

export interface NavPoint2 {
  x: number
  z: number
}

export interface NavPath {
  points: NavPoint2[]
  length: number
}

let initPromise: Promise<void> | null = null
let navMesh: NavMesh | null = null
let query: NavMeshQuery | null = null

export function ensureNavInit(): Promise<void> {
  if (!initPromise) initPromise = init()
  return initPromise
}

export async function loadNavMesh(data: ArrayBuffer | Uint8Array): Promise<NavMeshQuery> {
  await ensureNavInit()
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (navMesh) {
    navMesh.destroy()
    navMesh = null
    query = null
  }
  const imported = importNavMesh(bytes)
  navMesh = imported.navMesh
  query = new NavMeshQuery(navMesh)
  query.defaultQueryHalfExtents = { x: 2, y: 2, z: 2 }
  return query
}

export function getNavQuery(): NavMeshQuery | null {
  return query
}

export function findClosestNavPoint(
  x: number,
  z: number,
  halfExtents = 2
): NavPoint2 | null {
  if (!query) return null
  const c = query.findClosestPoint(
    { x, y: 0, z },
    { halfExtents: { x: halfExtents, y: 2, z: halfExtents } }
  )
  if (!c.success) return null
  return { x: c.point.x, z: c.point.z }
}

/** Nearest navmesh point that lies on a poly (rejects outside / wall clicks). */
export function findWalkableNavPoint(
  x: number,
  z: number,
  maxSnap = 1.25
): NavPoint2 | null {
  if (!query) return null
  const c = query.findClosestPoint(
    { x, y: 0, z },
    { halfExtents: { x: maxSnap, y: 2, z: maxSnap } }
  )
  if (!c.success || !c.isPointOverPoly) return null
  const dist = Math.hypot(c.point.x - x, c.point.z - z)
  if (dist > maxSnap) return null
  return { x: c.point.x, z: c.point.z }
}

export function findPath(from: NavPoint2, to: NavPoint2): NavPath | null {
  if (!query) return null
  const a = findClosestNavPoint(from.x, from.z)
  const b = findClosestNavPoint(to.x, to.z)
  if (!a || !b) return null
  const result = query.computePath({ x: a.x, y: 0, z: a.z }, { x: b.x, y: 0, z: b.z })
  if (!result.success || !result.path || result.path.length === 0) return null
  const points = result.path.map((p) => ({ x: p.x, z: p.z }))
  let length = 0
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!
    const p1 = points[i]!
    length += Math.hypot(p1.x - p0.x, p1.z - p0.z)
  }
  return { points, length }
}

export function disposeNav(): void {
  if (navMesh) {
    navMesh.destroy()
    navMesh = null
  }
  query = null
}
