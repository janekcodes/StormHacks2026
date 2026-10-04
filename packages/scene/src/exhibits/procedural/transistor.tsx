'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { proceduralMaterials } from './materials'

export function TransistorModel() {
  const M = proceduralMaterials()
  const holder = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const h = holder.current
    if (h) h.rotation.y = clock.elapsedTime * 0.35
  })

  return (
    <group>
      <mesh material={M.blackGloss} position={[0, 0.05, 0]}>
        <boxGeometry args={[0.46, 0.1, 0.46]} />
      </mesh>
      <group ref={holder}>
        {[-0.075, 0, 0.075].map((x) => (
          <mesh key={x} material={M.steel} position={[x, 0.28, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.36, 12]} />
          </mesh>
        ))}
        <mesh material={M.steel} position={[0, 0.475, 0]}>
          <cylinderGeometry args={[0.205, 0.205, 0.028, 64]} />
        </mesh>
        <mesh material={M.steel} position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.26, 64]} />
        </mesh>
        <mesh material={M.steel} position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.165, 0.17, 0.02, 64]} />
        </mesh>
        <mesh material={M.steel} position={[0.215, 0.475, 0]}>
          <boxGeometry args={[0.06, 0.028, 0.05]} />
        </mesh>
      </group>
    </group>
  )
}
