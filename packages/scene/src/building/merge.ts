import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { uvMetresOf } from './materials'
import { worldUv } from './textures'

export interface MergePart {
  geometry: THREE.BufferGeometry
  matrix: THREE.Matrix4
  material: THREE.Material
  castShadow: boolean
  receiveShadow: boolean
  /** Per-part colour, used when the material has `vertexColors`. */
  color?: THREE.Color
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

/** Any geometry placed with a full matrix. */
export function geoPart(
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  mat: THREE.Material,
  castShadow = true,
  receiveShadow = true
): MergePart {
  return { geometry, matrix, material: mat, castShadow, receiveShadow }
}

/** Matrix from position, yaw and optional pitch / roll. */
export function placeMatrix(x: number, y: number, z: number, rotY = 0, rotX = 0, rotZ = 0): THREE.Matrix4 {
  const m = new THREE.Matrix4()
  m.makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ'))
  m.setPosition(x, y, z)
  return m
}

/**
 * Merges parts per material and shadow flags into a handful of meshes.
 * Textured materials get world-space UVs (true scale, seamless across parts)
 * and `vertexColors` materials get a colour attribute from each part.
 */
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
    const metres = uvMetresOf(p.material)
    if (metres) worldUv(geo, metres)
    if ((p.material as THREE.MeshStandardMaterial).vertexColors) {
      const c = p.color ?? new THREE.Color(1, 1, 1)
      const n = geo.getAttribute('position').count
      const arr = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        arr[i * 3] = c.r
        arr[i * 3 + 1] = c.g
        arr[i * 3 + 2] = c.b
      }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    }
    for (const name of Object.keys(geo.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') {
        geo.deleteAttribute(name)
      }
    }
    if (!geo.getAttribute('uv')) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2))
    }
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
