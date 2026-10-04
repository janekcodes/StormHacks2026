'use client'

import type { Exhibit, Tier } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePlayer } from '../player/usePlayer'
import { ANIM_M, axisNear, CULL_M, faceYaw } from './focus'
import { footprintFor } from './footprint'
import { exhibitMaterials } from './materials'
import { ModelSlot } from './ModelSlot'

interface InstanceItem {
  x: number
  z: number
  yaw: number
  local: readonly [number, number, number]
  rotX: number
  rotY: number
  scale: readonly [number, number, number]
  spin: boolean
  spinIndex: number
  color?: THREE.Color
}

function boxItem(
  exhibit: Exhibit,
  y: number,
  w: number,
  h: number,
  d: number,
  localX = 0,
  localZ = 0
): InstanceItem {
  return {
    x: exhibit.position.x,
    z: exhibit.position.z,
    yaw: faceYaw(exhibit.position.face),
    local: [localX, y, localZ],
    rotX: 0,
    rotY: 0,
    scale: [w, h, d],
    spin: false,
    spinIndex: 0
  }
}

function InstancedBatch({
  geometry,
  material,
  items
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: readonly InstanceItem[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const parent = useMemo(() => new THREE.Object3D(), [])
  const child = useMemo(() => new THREE.Object3D(), [])
  const scratch = useMemo(() => new THREE.Matrix4(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    let colored = false
    items.forEach((item, index) => {
      if (!item.color) return
      mesh.setColorAt(index, item.color)
      colored = true
    })
    if (colored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const { x, z } = usePlayer.getState()
    const time = clock.elapsedTime
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      const visible = axisNear(x, z, item.x, item.z, CULL_M)
      const spin =
        item.spin && visible && axisNear(x, z, item.x, item.z, ANIM_M)
          ? time * 0.6 + item.spinIndex
          : 0
      parent.position.set(item.x, 0, item.z)
      parent.rotation.set(0, item.yaw, 0)
      parent.scale.set(1, 1, 1)
      parent.updateMatrix()
      child.position.set(item.local[0], item.local[1], item.local[2])
      child.rotation.set(item.rotX, item.rotY + spin, 0)
      const s = visible ? 1 : 0
      child.scale.set(item.scale[0] * s, item.scale[1] * s, item.scale[2] * s)
      child.updateMatrix()
      scratch.multiplyMatrices(parent.matrix, child.matrix)
      mesh.setMatrixAt(i, scratch)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (items.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      dispose={null}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  )
}

function iconItems(
  exhibits: readonly Exhibit[],
  tier: Extract<Tier, 'core' | 'extended'>,
  geoIndex: number
): InstanceItem[] {
  const items: InstanceItem[] = []
  exhibits.forEach((exhibit, index) => {
    if (exhibit.tier !== tier || index % 5 !== geoIndex) return
    const fp = footprintFor(exhibit)
    const y = tier === 'core' ? fp.h + 0.32 : fp.h + 0.2
    const s = tier === 'core' ? 1 : 0.7
    items.push({
      x: exhibit.position.x,
      z: exhibit.position.z,
      yaw: faceYaw(exhibit.position.face),
      local: [0, y, 0],
      rotX: 0,
      rotY: 0,
      scale: [s, s, s],
      spin: true,
      spinIndex: index,
      color: new THREE.Color(zoneByCode(exhibit.zone)?.ink ?? '#4f5963')
    })
  })
  return items
}

/** Core vitrine, extended plinth, open floor ring, and a neutral box on built stands. */
export function Placeholder({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const mats = exhibitMaterials()
  const core = useMemo(() => exhibits.filter((exhibit) => exhibit.tier === 'core'), [exhibits])
  const extended = useMemo(
    () => exhibits.filter((exhibit) => exhibit.tier === 'extended'),
    [exhibits]
  )
  const open = useMemo(() => exhibits.filter((exhibit) => exhibit.tier === 'open'), [exhibits])
  const built = useMemo(() => exhibits.filter((exhibit) => exhibit.tier === 'built'), [exhibits])

  const corePlinths = useMemo(
    () => core.map((exhibit) => {
      const fp = footprintFor(exhibit)
      return boxItem(exhibit, fp.h / 2, fp.w, fp.h, fp.d)
    }),
    [core]
  )
  const coreGlass = useMemo(
    () =>
      core.map((exhibit) => {
        const fp = footprintFor(exhibit)
        return boxItem(exhibit, fp.h + 0.33, 0.78, 0.66, 0.78)
      }),
    [core]
  )
  const coreFrames = useMemo(
    () =>
      core.map((exhibit) => {
        const fp = footprintFor(exhibit)
        return boxItem(exhibit, fp.h + 0.67, 0.8, 0.02, 0.8)
      }),
    [core]
  )
  const extPlinths = useMemo(
    () =>
      extended.map((exhibit) => {
        const fp = footprintFor(exhibit)
        return boxItem(exhibit, fp.h / 2, fp.w, fp.h, fp.d)
      }),
    [extended]
  )
  const floorStands = useMemo(
    () =>
      built
        .filter((exhibit) => footprintFor(exhibit).floor)
        .map((exhibit) => {
          const fp = footprintFor(exhibit)
          return boxItem(exhibit, fp.h / 2, fp.w, fp.h, fp.d)
        }),
    [built]
  )
  const floorPosts = useMemo(
    () =>
      built
        .filter((exhibit) => footprintFor(exhibit).floor)
        .map((exhibit) => boxItem(exhibit, 0.31, 0.05, 0.62, 0.05, 0.75, 1.25)),
    [built]
  )
  const plinths = useMemo(
    () =>
      built
        .filter((exhibit) => !footprintFor(exhibit).floor)
        .map((exhibit) => {
          const fp = footprintFor(exhibit)
          return boxItem(exhibit, fp.h / 2, fp.w, fp.h, fp.d)
        }),
    [built]
  )
  const caps = useMemo(
    () =>
      built
        .filter((exhibit) => !footprintFor(exhibit).floor)
        .map((exhibit) => {
          const fp = footprintFor(exhibit)
          return boxItem(exhibit, fp.h + 0.015, fp.w + 0.04, 0.03, fp.d + 0.04)
        }),
    [built]
  )
  const rings = useMemo(
    (): InstanceItem[] =>
      open.map((exhibit) => ({
        x: exhibit.position.x,
        z: exhibit.position.z,
        yaw: faceYaw(exhibit.position.face),
        local: [0, 0.034, 0],
        rotX: -Math.PI / 2,
        rotY: 0,
        scale: [1, 1, 1],
        spin: false,
        spinIndex: 0
      })),
    [open]
  )
  const stands = useMemo(
    () => open.map((exhibit) => boxItem(exhibit, 0.39, 0.04, 0.78, 0.04, 0, -0.03)),
    [open]
  )
  const icons = useMemo(() => {
    const batches: { geometry: THREE.BufferGeometry; material: THREE.Material; items: InstanceItem[] }[] = []
    for (let geo = 0; geo < mats.icons.length; geo++) {
      const geometry = mats.icons[geo]
      if (!geometry) continue
      batches.push({
        geometry,
        material: mats.iconCore,
        items: iconItems(exhibits, 'core', geo)
      })
      batches.push({
        geometry,
        material: mats.iconExt,
        items: iconItems(exhibits, 'extended', geo)
      })
    }
    return batches
  }, [exhibits, mats.iconCore, mats.iconExt, mats.icons])

  return (
    <>
      <InstancedBatch geometry={mats.unit} material={mats.plinth} items={corePlinths} />
      <InstancedBatch geometry={mats.unit} material={mats.glass} items={coreGlass} />
      <InstancedBatch geometry={mats.unit} material={mats.frame} items={coreFrames} />
      <InstancedBatch geometry={mats.unit} material={mats.plinthGrey} items={extPlinths} />
      <InstancedBatch geometry={mats.unit} material={mats.platform} items={floorStands} />
      <InstancedBatch geometry={mats.unit} material={mats.brushed} items={floorPosts} />
      <InstancedBatch geometry={mats.unit} material={mats.plinth} items={plinths} />
      <InstancedBatch geometry={mats.unit} material={mats.plinth} items={caps} />
      <InstancedBatch geometry={mats.ringGeo} material={mats.ring} items={rings} />
      <InstancedBatch geometry={mats.unit} material={mats.brushed} items={stands} />
      {icons.map((batch, index) => (
        <InstancedBatch
          key={index}
          geometry={batch.geometry}
          material={batch.material}
          items={batch.items}
        />
      ))}
      {built.map((exhibit) => (
        <ModelSlot key={exhibit.id} exhibit={exhibit} />
      ))}
    </>
  )
}
