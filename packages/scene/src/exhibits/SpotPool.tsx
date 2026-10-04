'use client'

import type { Exhibit } from '@museum/content/schema'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Object3D, SpotLight } from 'three'
import { useGuideStore } from '../guide/state'
import type { Seg } from '../player/collision'
import { usePlayer } from '../player/usePlayer'
import { lineClear } from './focus'
import { useExhibitUi } from './ui'

const SPOT_COUNT = 6
const RANGE_M = 20

/** Where a gallery spot hangs for an exhibit: above and in front, on the ceiling track. */
export function spotMount(exhibit: Pick<Exhibit, 'position'>): { x: number; z: number } {
  return {
    x: exhibit.position.x + exhibit.position.face[0] * 1.4,
    z: exhibit.position.z + exhibit.position.face[1] * 1.4
  }
}

/**
 * Six physically decaying gallery spots, reassigned to the nearest exhibits
 * the visitor can actually see (no lights through walls).
 */
export function SpotPool({ exhibits, walls }: { exhibits: readonly Exhibit[]; walls: readonly Seg[] }) {
  const lights = useRef<(SpotLight | null)[]>([])
  const targets = useRef<(Object3D | null)[]>([])
  const assigned = useRef<number[]>([])
  const frame = useRef(0)

  useFrame(() => {
    frame.current += 1
    const { x, z } = usePlayer.getState()
    const { focusId, hoverId } = useExhibitUi.getState()
    const highlightIds = useGuideStore.getState().highlightIds

    if (frame.current % 10 === 1) {
      const near: { index: number; dist: number }[] = []
      for (let i = 0; i < exhibits.length; i++) {
        const exhibit = exhibits[i]
        if (!exhibit) continue
        const dist = Math.hypot(exhibit.position.x - x, exhibit.position.z - z)
        if (dist < RANGE_M) near.push({ index: i, dist })
      }
      near.sort((a, b) => a.dist - b.dist)
      const picked: number[] = []
      for (const item of near) {
        if (picked.length >= SPOT_COUNT) break
        const exhibit = exhibits[item.index]
        if (!exhibit) continue
        const m = spotMount(exhibit)
        if (lineClear(x, z, m.x, m.z, walls)) picked.push(item.index)
      }
      assigned.current = picked
    }

    for (let j = 0; j < SPOT_COUNT; j++) {
      const light = lights.current[j]
      const target = targets.current[j]
      const index = assigned.current[j]
      if (!light || !target || index === undefined) {
        if (light) light.intensity += (0 - light.intensity) * 0.2
        continue
      }
      const exhibit = exhibits[index]
      if (!exhibit) {
        light.intensity = 0
        continue
      }
      const m = spotMount(exhibit)
      if (light.position.x !== m.x || light.position.z !== m.z) {
        light.position.set(m.x, 4.7, m.z)
        light.intensity = 0
      }
      target.position.set(exhibit.position.x, 1, exhibit.position.z)
      if (light.target !== target) light.target = target
      target.updateMatrixWorld()
      const highlighted = highlightIds.includes(exhibit.id)
      const hot = exhibit.id === focusId || exhibit.id === hoverId
      const want = highlighted ? 75 : hot ? 55 : 38
      light.intensity += (want - light.intensity) * 0.12
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
          color={0xffe6c4}
          intensity={0}
          distance={9}
          angle={0.36}
          penumbra={0.55}
          decay={2}
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
