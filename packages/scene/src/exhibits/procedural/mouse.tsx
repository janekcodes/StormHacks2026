'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { proceduralMaterials } from './materials'

/**
 * Stylised first computer mouse (Bill English, 1964): a wooden body, one
 * button and two perpendicular wheels, with a trailing cable. Interim model
 * for E3; see docs/decisions/0008-e3-procedural-model.md.
 */
export function MouseModel() {
  const M = proceduralMaterials()
  const spin = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.elapsedTime * 0.3
  })

  return (
    <group>
      <group ref={spin}>
        {/* wooden body */}
        <mesh material={M.wood} position={[0, 0.15, 0]}>
          <boxGeometry args={[0.5, 0.16, 0.28]} />
        </mesh>
        {/* single button on top */}
        <mesh material={M.ivory} position={[-0.08, 0.25, 0]}>
          <boxGeometry args={[0.12, 0.04, 0.14]} />
        </mesh>
        {/* two perpendicular wheels, peeking below the body */}
        <mesh material={M.steel} position={[0.18, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.02, 32]} />
        </mesh>
        <mesh material={M.steel} position={[-0.18, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.02, 32]} />
        </mesh>
        {/* trailing cable */}
        <mesh material={M.blackMatte} position={[0.3, 0.16, 0]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.012, 0.012, 0.42, 12]} />
        </mesh>
      </group>
    </group>
  )
}
