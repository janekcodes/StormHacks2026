'use client'

import type { Exhibit, Tier } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { museumMaterials } from '../building/materials'
import { usePlayer } from '../player/usePlayer'
import { ANIM_M, axisNear, CULL_M, faceYaw } from './focus'
import { footprintFor } from './footprint'
import { exhibitMaterials } from './materials'
import { ModelSlot } from './ModelSlot'
import { standParts, type StandMaterial, type StandPart } from './stands'

interface InstanceItem {
  /** Index of the owning exhibit, for distance culling. */
  owner: number
  matrix: THREE.Matrix4
  color?: THREE.Color
}

interface SpinItem {
  owner: number
  x: number
  z: number
  y: number
  yaw: number
  scale: number
  phase: number
  color: THREE.Color
}

const NON_SHADOW: ReadonlySet<StandMaterial> = new Set(['glass', 'caseLight'])
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)

function partMatrix(exhibit: Exhibit, part: StandPart): THREE.Matrix4 {
  const parent = new THREE.Matrix4().makeRotationY(faceYaw(exhibit.position.face))
  parent.setPosition(exhibit.position.x, 0, exhibit.position.z)
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...part.at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(part.rotX ?? 0, part.rotY ?? 0, 0, 'YXZ')),
    new THREE.Vector3(...part.size)
  )
  return parent.multiply(local)
}

function StaticBatch({
  geometry,
  material,
  items,
  exhibits,
  shadows
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: readonly InstanceItem[]
  exhibits: readonly Exhibit[]
  shadows: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const visible = useRef<boolean[]>([])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, i) => {
      mesh.setMatrixAt(i, item.matrix)
      if (item.color) mesh.setColorAt(i, item.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    visible.current = exhibits.map(() => true)
  }, [items, exhibits])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const { x, z } = usePlayer.getState()
    let dirty = false
    const flags = visible.current
    for (let e = 0; e < exhibits.length; e++) {
      const exhibit = exhibits[e]
      if (!exhibit) continue
      const near = axisNear(x, z, exhibit.position.x, exhibit.position.z, CULL_M)
      if (flags[e] !== near) {
        flags[e] = near
        dirty = true
      }
    }
    if (!dirty) return
    items.forEach((item, i) => {
      mesh.setMatrixAt(i, flags[item.owner] ? item.matrix : ZERO)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  if (items.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      dispose={null}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  )
}

/** Spinning stand-in icons for exhibits that have neither a GLB nor a procedural model. */
function SpinBatch({
  geometry,
  material,
  items
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: readonly SpinItem[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const obj = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((item, i) => mesh.setColorAt(i, item.color))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const { x, z } = usePlayer.getState()
    items.forEach((item, i) => {
      const visible = axisNear(x, z, item.x, item.z, CULL_M)
      const spin = visible && axisNear(x, z, item.x, item.z, ANIM_M) ? clock.elapsedTime * 0.6 + item.phase : 0
      obj.position.set(item.x, item.y, item.z)
      obj.rotation.set(0, item.yaw + spin, 0)
      obj.scale.setScalar(visible ? item.scale : 0)
      obj.updateMatrix()
      mesh.setMatrixAt(i, obj.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  if (items.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} dispose={null} frustumCulled={false} />
}

function spinItems(exhibits: readonly Exhibit[], tier: Extract<Tier, 'core' | 'extended'>, geoIndex: number): SpinItem[] {
  const items: SpinItem[] = []
  exhibits.forEach((exhibit, index) => {
    if (exhibit.tier !== tier || exhibit.model || index % 5 !== geoIndex) return
    const fp = footprintFor(exhibit)
    items.push({
      owner: index,
      x: exhibit.position.x,
      z: exhibit.position.z,
      y: tier === 'core' ? fp.h + 0.32 : fp.h + 0.2,
      yaw: faceYaw(exhibit.position.face),
      scale: tier === 'core' ? 1 : 0.7,
      phase: index,
      color: new THREE.Color(zoneByCode(exhibit.zone)?.ink ?? '#4f5963')
    })
  })
  return items
}

/** Vitrines, pedestals, plinths, daises, stanchions and label mounts for every exhibit. */
export function Placeholder({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const mats = exhibitMaterials()
  const surfaces = museumMaterials()
  const quality = usePlayer((s) => s.quality)
  const shadows = quality === 'high'

  const batches = useMemo(() => {
    const groups = new Map<string, { mat: StandMaterial; shape: StandPart['shape']; items: InstanceItem[] }>()
    exhibits.forEach((exhibit, owner) => {
      for (const part of standParts(exhibit)) {
        const key = `${part.mat}:${part.shape}`
        let g = groups.get(key)
        if (!g) {
          g = { mat: part.mat, shape: part.shape, items: [] }
          groups.set(key, g)
        }
        g.items.push({ owner, matrix: partMatrix(exhibit, part) })
      }
    })
    return [...groups.values()]
  }, [exhibits])

  const rings = useMemo((): InstanceItem[] => {
    const out: InstanceItem[] = []
    exhibits.forEach((exhibit, owner) => {
      if (exhibit.tier !== 'open') return
      const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
      m.setPosition(exhibit.position.x, 0.034, exhibit.position.z)
      out.push({ owner, matrix: m })
    })
    return out
  }, [exhibits])

  const icons = useMemo(() => {
    const out: { geometry: THREE.BufferGeometry; material: THREE.Material; items: SpinItem[] }[] = []
    mats.icons.forEach((geometry, geo) => {
      out.push({ geometry, material: mats.iconCore, items: spinItems(exhibits, 'core', geo) })
      out.push({ geometry, material: mats.iconExt, items: spinItems(exhibits, 'extended', geo) })
    })
    return out
  }, [exhibits, mats])

  const modeled = useMemo(() => exhibits.filter((exhibit) => exhibit.model), [exhibits])

  return (
    <>
      {batches.map((b) => (
        <StaticBatch
          key={`${b.mat}:${b.shape}`}
          geometry={b.shape === 'post' ? mats.post : mats.unit}
          material={surfaces[b.mat]}
          items={b.items}
          exhibits={exhibits}
          shadows={shadows && !NON_SHADOW.has(b.mat)}
        />
      ))}
      <StaticBatch geometry={mats.ringGeo} material={surfaces.brass} items={rings} exhibits={exhibits} shadows={false} />
      {icons.map((batch, index) => (
        <SpinBatch key={index} geometry={batch.geometry} material={batch.material} items={batch.items} />
      ))}
      {modeled.map((exhibit) => (
        <ModelSlot key={exhibit.id} exhibit={exhibit} />
      ))}
    </>
  )
}
