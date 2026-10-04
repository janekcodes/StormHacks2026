'use client'

import type { Exhibit } from '@museum/content/schema'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Object3D, SpotLight } from 'three'
import { useExhibitUi } from './ui'
import { usePlayer } from '../player/usePlayer'

const SPOT_COUNT = 6

/** Six spotlights, reassigned to the nearest exhibits. */
export function SpotPool({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const lights = useRef<(SpotLight | null)[]>([])
  const targets = useRef<(Object3D | null)[]>([])
  const assigned = useRef<number[]>([])
  const frame = useRef(0)

  useFrame(() => {
    frame.current += 1
    const { x, z } = usePlayer.getState()
    const { focusId, hoverId } = useExhibitUi.getState()

    if (frame.current % 8 === 1) {
      const near: { index: number; dist: number }[] = []
      for (let i = 0; i < exhibits.length; i++) {
        const exhibit = exhibits[i]
        if (!exhibit) continue
        const dist = Math.hypot(exhibit.position.x - x, exhibit.position.z - z)
        if (dist < 20) near.push({ index: i, dist })
      }
      near.sort((a, b) => a.dist - b.dist)
      assigned.current = near.slice(0, SPOT_COUNT).map((item) => item.index)
    }

    for (let j = 0; j < SPOT_COUNT; j++) {
      const light = lights.current[j]
      const target = targets.current[j]
      const index = assigned.current[j]
      if (!light || !target || index === undefined) {
        if (light) light.intensity = 0
        continue
      }
      const exhibit = exhibits[index]
      if (!exhibit) {
        light.intensity = 0
        continue
      }
      const fx = exhibit.position.face[0]
      const fz = exhibit.position.face[1]
      light.position.set(
        exhibit.position.x + fx * 1.6,
        4.85,
        exhibit.position.z + fz * 1.6
      )
      target.position.set(exhibit.position.x, 1, exhibit.position.z)
      if (light.target !== target) light.target = target
      target.updateMatrixWorld()
      const hot = exhibit.id === focusId || exhibit.id === hoverId
      const want = hot ? 1.9 : 1.2
      light.intensity += (want - light.intensity) * 0.15
    }
  })

  return (
    <>
      {Array.from({ length: SPOT_COUNT }, (_, index) => (
        <spotLight
          key={index}
          ref={(el) => {
            lights.current[index] = el
          }}
          color={0xfff3e2}
          intensity={0}
          distance={12}
          angle={0.5}
          penumbra={0.75}
          decay={1}
          castShadow={false}
        />
      ))}
      {Array.from({ length: SPOT_COUNT }, (_, index) => (
        <object3D
          key={`t${index}`}
          ref={(el) => {
            targets.current[index] = el
          }}
        />
      ))}
    </>
  )
}
