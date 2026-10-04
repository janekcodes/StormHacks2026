import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Tracks which meshes under a root move relative to it. After enough frames,
 * `merge()` collapses every mesh that never moved into one mesh per material
 * (and shadow flags), hiding the originals. Animated parts keep their own
 * meshes; material-only animation still works because materials are shared.
 */
export class StaticMerger {
  private readonly root: THREE.Object3D
  private readonly baseline = new Map<THREE.Mesh, THREE.Matrix4>()
  private readonly moved = new Set<THREE.Mesh>()
  private readonly inv = new THREE.Matrix4()
  private readonly scratch = new THREE.Matrix4()
  private merged: THREE.Mesh[] = []

  constructor(root: THREE.Object3D) {
    this.root = root
  }

  private relative(mesh: THREE.Mesh, out: THREE.Matrix4): THREE.Matrix4 {
    this.root.updateWorldMatrix(true, true)
    this.inv.copy(this.root.matrixWorld).invert()
    return out.multiplyMatrices(this.inv, mesh.matrixWorld)
  }

  private meshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = []
    this.root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(m.material)) out.push(m)
    })
    return out
  }

  /** Call once per frame while observing. */
  sample(): void {
    for (const mesh of this.meshes()) {
      const rel = this.relative(mesh, this.scratch)
      const base = this.baseline.get(mesh)
      if (!base) {
        this.baseline.set(mesh, rel.clone())
      } else if (!base.equals(rel)) {
        this.moved.add(mesh)
      }
    }
  }

  merge(): void {
    const groups = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; parts: THREE.BufferGeometry[]; sources: THREE.Mesh[] }>()
    for (const mesh of this.meshes()) {
      if (this.moved.has(mesh) || !mesh.visible || mesh.children.length > 0) continue
      const material = mesh.material as THREE.Material
      const key = `${material.uuid}:${mesh.castShadow ? 1 : 0}:${mesh.receiveShadow ? 1 : 0}`
      let g = groups.get(key)
      if (!g) {
        g = { material, cast: mesh.castShadow, receive: mesh.receiveShadow, parts: [], sources: [] }
        groups.set(key, g)
      }
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      for (const name of Object.keys(geo.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name)
      }
      if (!geo.getAttribute('normal')) geo.computeVertexNormals()
      if (!geo.getAttribute('uv')) {
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2))
      }
      geo.morphAttributes = {}
      geo.applyMatrix4(this.relative(mesh, this.scratch))
      g.parts.push(geo)
      g.sources.push(mesh)
    }
    for (const g of groups.values()) {
      if (g.sources.length < 2) {
        g.parts.forEach((p) => p.dispose())
        continue
      }
      const geometry = mergeGeometries(g.parts, false)
      g.parts.forEach((p) => p.dispose())
      if (!geometry) continue
      geometry.computeBoundingSphere()
      const mesh = new THREE.Mesh(geometry, g.material)
      mesh.castShadow = g.cast
      mesh.receiveShadow = g.receive
      mesh.userData.staticMerge = true
      this.root.add(mesh)
      this.merged.push(mesh)
      for (const src of g.sources) src.visible = false
    }
  }

  dispose(): void {
    for (const m of this.merged) {
      m.removeFromParent()
      m.geometry.dispose()
    }
    this.merged = []
  }
}
