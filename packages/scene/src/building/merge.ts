import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export interface MergePart {
  geometry: THREE.BufferGeometry
  matrix: THREE.Matrix4
  material: THREE.Material
  castShadow: boolean
  receiveShadow: boolean
}

export interface MergedMesh {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  castShadow: boolean
  receiveShadow: boolean
}

export function boxPart(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rotY: number,
  castShadow = true,
  receiveShadow = true
): MergePart {
  const geometry = new THREE.BoxGeometry(w, h, d)
  const matrix = new THREE.Matrix4()
  matrix.makeRotationY(rotY)
  matrix.setPosition(x, y, z)
  return { geometry, matrix, material: mat, castShadow, receiveShadow }
}

export function cylPart(
  rt: number,
  rb: number,
  h: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  segments = 32,
  castShadow = true,
  receiveShadow = true
): MergePart {
  const geometry = new THREE.CylinderGeometry(rt, rb, h, segments)
  const matrix = new THREE.Matrix4()
  matrix.setPosition(x, y, z)
  return { geometry, matrix, material: mat, castShadow, receiveShadow }
}

export function mergeParts(parts: MergePart[]): MergedMesh[] {
  const groups = new Map<
    string,
    { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; rec: boolean }
  >()

  for (const p of parts) {
    const key = `${p.material.uuid}:${p.castShadow ? 1 : 0}:${p.receiveShadow ? 1 : 0}`
    let g = groups.get(key)
    if (!g) {
      g = { mat: p.material, geos: [], cast: p.castShadow, rec: p.receiveShadow }
      groups.set(key, g)
    }
    const geo = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone()
    geo.applyMatrix4(p.matrix)
    g.geos.push(geo)
    p.geometry.dispose()
  }

  const out: MergedMesh[] = []
  for (const g of groups.values()) {
    const merged = mergeGeometries(g.geos, false)
    for (const geo of g.geos) geo.dispose()
    if (!merged) continue
    merged.computeBoundingSphere()
    out.push({
      geometry: merged,
      material: g.mat,
      castShadow: g.cast,
      receiveShadow: g.rec
    })
  }
  return out
}
