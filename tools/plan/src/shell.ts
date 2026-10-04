import type { Building } from '@museum/content'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Building-shell glTF export for Blender lightmap baking (plan 09 / decision 0005).
 *
 * This reproduces the opaque static surfaces rendered by `Walls.tsx` and
 * `Floors.tsx` in the scene package, at the same metre scale and dimensions,
 * so an artist can bake AO + indirect light on the exact mesh that ships.
 * Glass is intentionally excluded: transparent panes must not occlude the bake.
 *
 * The emitted `uv2` (TEXCOORD_1) is a placeholder copy of `uv`; the artist
 * re-unwraps with Lightmap Pack in Blender (see docs/decisions/0005-lighting.md).
 */

const WALL_H = 5
const CEIL_H = 5

function material(name: string, color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ name, color, roughness: 0.9 })
}

/** A box wall segment, matching the scene's `boxPart` transform (rotate then translate). */
function wallBoxGeometry(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  y0: number,
  y1: number,
  thick: number
): THREE.BoxGeometry {
  const dx = x2 - x1
  const dz = z2 - z1
  const L = Math.hypot(dx, dz) || 1
  const geo = new THREE.BoxGeometry(L + thick * 0.5, y1 - y0, thick)
  geo.rotateY(-Math.atan2(dz, dx))
  geo.translate((x1 + x2) / 2, (y0 + y1) / 2, (z1 + z2) / 2)
  return geo
}

/**
 * A shape in the XZ plane with +Y normals, from plan-space rings. Mirrors
 * `buildFloorMesh` in `navmesh.ts` but also supports interior holes (atrium).
 */
function xzShapeGeometry(
  poly: readonly (readonly [number, number])[],
  holes: readonly (readonly (readonly [number, number])[])[] = []
): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  poly.forEach((p, i) => {
    if (i === 0) shape.moveTo(p[0], p[1])
    else shape.lineTo(p[0], p[1])
  })
  shape.closePath()
  for (const hole of holes) {
    const path = new THREE.Path()
    hole.forEach((p, i) => {
      if (i === 0) path.moveTo(p[0], p[1])
      else path.lineTo(p[0], p[1])
    })
    path.closePath()
    shape.holes.push(path)
  }

  const geom = new THREE.ShapeGeometry(shape)
  geom.rotateX(-Math.PI / 2)
  const position = geom.getAttribute('position')
  if (!(position instanceof THREE.BufferAttribute)) {
    throw new Error('shell shape missing position attribute')
  }
  const arr = position.array
  for (let i = 2; i < arr.length; i += 3) arr[i]! *= -1
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
  return geom
}

/** Flip triangle winding and vertex normals so an XZ surface faces down. */
function flipDown(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geom.index
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1)
      idx.setX(i + 1, idx.getX(i + 2))
      idx.setX(i + 2, b)
    }
    idx.needsUpdate = true
  }
  const normal = geom.getAttribute('normal')
  if (normal instanceof THREE.BufferAttribute) {
    for (let i = 0; i < normal.count; i++) {
      normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i))
    }
    normal.needsUpdate = true
  }
  return geom
}

/** Placeholder lightmap UV: copy `uv` into `uv2` (TEXCOORD_1) when it exists. */
function addUv2(geom: THREE.BufferGeometry): void {
  const uv = geom.getAttribute('uv')
  if (uv instanceof THREE.BufferAttribute) {
    const uv2 = new THREE.BufferAttribute(new Float32Array(uv.array.length), uv.itemSize)
    for (let i = 0; i < uv.array.length; i++) uv2.array[i] = uv.array[i]!
    geom.setAttribute('uv2', uv2)
  }
}

/** Build the opaque building shell as a THREE scene (walls, floor, ceiling). */
export function buildShellScene(building: Building): THREE.Scene {
  const wallMat = material('Wall', 0xe4e1da)
  const baseMat = material('Base', 0x2b2d30)
  const floorMat = material('Floor', 0xc4bdb1)
  const ceilMat = material('Ceiling', 0xf3f2ef)

  const wallGeos: THREE.BoxGeometry[] = []
  const baseGeos: THREE.BoxGeometry[] = []

  for (const s of building.walls) {
    const seg: readonly [number, number, number, number] = [s[0], s[1], s[2], s[3]]
    if (s[4] === 'ext') {
      wallGeos.push(wallBoxGeometry(seg[0], seg[1], seg[2], seg[3], 0, 0.9, 0.3))
      wallGeos.push(wallBoxGeometry(seg[0], seg[1], seg[2], seg[3], 4.2, WALL_H, 0.3))
      // glass band 0.9–4.2 m is transparent and omitted from the bake
    } else {
      wallGeos.push(wallBoxGeometry(seg[0], seg[1], seg[2], seg[3], 0, WALL_H, 0.3))
    }
    baseGeos.push(wallBoxGeometry(seg[0], seg[1], seg[2], seg[3], 0, 0.12, 0.34))
  }

  for (const s of building.lintels) {
    wallGeos.push(wallBoxGeometry(s[0], s[1], s[2], s[3], 3.4, WALL_H, 0.3))
  }

  const scene = new THREE.Scene()

  const walls = mergeGeometries(wallGeos, false)
  if (walls) {
    addUv2(walls)
    scene.add(new THREE.Mesh(walls, wallMat))
  }
  for (const g of wallGeos) g.dispose()

  const bases = mergeGeometries(baseGeos, false)
  if (bases) {
    addUv2(bases)
    scene.add(new THREE.Mesh(bases, baseMat))
  }
  for (const g of baseGeos) g.dispose()

  const floor = xzShapeGeometry(building.outline)
  addUv2(floor)
  scene.add(new THREE.Mesh(floor, floorMat))

  const atr = building.rooms.find((r) => r.key === 'Atr')
  const ceiling = xzShapeGeometry(building.outline, atr ? [atr.poly] : [])
  flipDown(ceiling)
  ceiling.translate(0, CEIL_H, 0)
  addUv2(ceiling)
  scene.add(new THREE.Mesh(ceiling, ceilMat))

  return scene
}

/**
 * GLTFExporter relies on the browser `FileReader` API, which Node lacks.
 * Install a minimal Blob-backed shim so the exporter works in the CLI and tests.
 */
function ensureFileReader(): void {
  const host = globalThis as unknown as { FileReader?: unknown }
  if (typeof host.FileReader !== 'undefined') return
  class NodeFileReader {
    result: string | ArrayBuffer | null = null
    onloadend: (() => void) | null = null
    readAsArrayBuffer(blob: Blob): void {
      void blob.arrayBuffer().then((buf) => {
        this.result = buf
        this.onloadend?.()
      })
    }
    readAsDataURL(blob: Blob): void {
      void blob.arrayBuffer().then((buf) => {
        this.result = `data:application/octet-stream;base64,${Buffer.from(buf).toString('base64')}`
        this.onloadend?.()
      })
    }
  }
  ;(globalThis as unknown as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader
}

/** Export the shell to a binary GLB at `target`, returning the byte length. */
export async function exportShellGlb(building: Building, target: string): Promise<number> {
  ensureFileReader()
  const scene = buildShellScene(building)
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    new GLTFExporter().parse(
      scene,
      (result) => resolve(result as ArrayBuffer),
      (error) => reject(new Error(error instanceof Error ? error.message : String(error))),
      { binary: true }
    )
  })
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, new Uint8Array(bytes))
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.geometry.dispose()
  })
  return bytes.byteLength
}
