'use client'

import type { Building } from '@museum/content/plan-schema'
import type { Exhibit } from '@museum/content/schema'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { buildCollisionSegments } from '../player/collision'
import { usePlayer } from '../player/usePlayer'
import { axisNear, CULL_M, faceYaw } from './focus'
import { footprintFor } from './footprint'
import { registerHit } from './hits'
import { exhibitMaterials } from './materials'
import { Plaque } from './Plaque'
import { Placeholder } from './Placeholder'
import { useFocus } from './useFocus'

function HitVolume({ exhibit }: { exhibit: Exhibit }) {
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const fp = footprintFor(exhibit)
  const width = exhibit.tier === 'built' && fp.floor ? 2.4 : 1.4
  const yaw = faceYaw(exhibit.position.face)

  useEffect(() => {
    const hit = mesh.current
    if (!hit) return
    hit.userData.exhibitId = exhibit.id
    hit.userData.x = exhibit.position.x
    hit.userData.z = exhibit.position.z
    return registerHit(hit)
  }, [exhibit])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const { x, z } = usePlayer.getState()
    g.visible = axisNear(x, z, exhibit.position.x, exhibit.position.z, CULL_M)
  })

  return (
    <group ref={group} position={[exhibit.position.x, 0, exhibit.position.z]} rotation={[0, yaw, 0]}>
      <mesh
        ref={mesh}
        geometry={exhibitMaterials().hitGeo}
        material={exhibitMaterials().hit}
        position={[0, 1.3, 0]}
        scale={[width, 1, width]}
        visible={false}
        dispose={null}
      />
    </group>
  )
}

export function Exhibits({
  building,
  exhibits
}: {
  building: Building
  exhibits: readonly Exhibit[]
}) {
  const segs = useMemo(() => buildCollisionSegments(building), [building])
  useFocus(exhibits, segs)

  useEffect(() => {
    const el = document.querySelector('.museum-view')
    if (el) el.setAttribute('data-exhibit-count', String(exhibits.length))
  }, [exhibits.length])

  return (
    <>
      <Placeholder exhibits={exhibits} />
      <Plaque exhibits={exhibits} />
      {exhibits.map((exhibit) => (
        <HitVolume key={exhibit.id} exhibit={exhibit} />
      ))}
    </>
  )
}
