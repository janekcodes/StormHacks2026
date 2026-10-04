'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { proceduralMaterials } from './materials'

function TubeGrid({ geometry, material }: { geometry: THREE.BufferGeometry; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const d = new THREE.Object3D()
    let k = 0
    for (let cx = 0; cx < 6; cx++) {
      for (let cy = 0; cy < 11; cy++) {
        d.position.set(-0.25 + cx * 0.1, 0.78 + cy * 0.105, 0.31)
        d.updateMatrix()
        mesh.setMatrixAt(k++, d.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={ref} args={[geometry, material, 66]} frustumCulled={false} />
}

export function EniacModel() {
  const M = proceduralMaterials()
  const cab = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x2f2b27, roughness: 0.55, metalness: 0.35 }), [])
  const panel = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.7 }), [])
  const tubeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xffb066, emissive: 0xff8a2a, emissiveIntensity: 1.4, roughness: 0.2 }),
    []
  )
  const tubeGeo = useMemo(() => new THREE.CylinderGeometry(0.017, 0.017, 0.075, 10), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    tubeMat.emissiveIntensity = 1.25 + 0.15 * Math.sin(t * 9.1) * Math.sin(t * 2.3)
  })

  return (
    <group>
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * 0.76, 0, i === 0 ? -0.18 : 0.02]} rotation={[0, -i * 0.34, 0]}>
          <mesh material={cab} position={[0, 1, 0]}>
            <boxGeometry args={[0.72, 2.0, 0.55]} />
          </mesh>
          <mesh material={M.brushed} position={[0, 2.02, 0]}>
            <boxGeometry args={[0.76, 0.05, 0.59]} />
          </mesh>
          <mesh material={panel} position={[0, 1.3, 0.28]}>
            <boxGeometry args={[0.6, 1.25, 0.02]} />
          </mesh>
          <TubeGrid geometry={tubeGeo} material={tubeMat} />
          {[0, 1, 2, 3, 4].map((kx) => (
            <mesh key={kx} material={M.brushed} position={[-0.22 + kx * 0.11, 0.42, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.03, 16]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
