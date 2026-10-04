'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'

export function RackModel() {
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.45, metalness: 0.55 }), [])
  const unit = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.38, metalness: 0.7 }), [])

  const ventTex = useMemo(
    () =>
      canvasTexture(256, 64, (g, w, h) => {
        g.fillStyle = '#2a3036'
        g.fillRect(0, 0, w, h)
        g.fillStyle = '#14181c'
        for (let x = 12; x < w - 60; x += 9) g.fillRect(x, 12, 5, h - 24)
      }),
    []
  )
  const unitFace = useMemo(
    () => new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.4, metalness: 0.6 }),
    [ventTex]
  )
  const ledMats = useMemo(
    () =>
      [0, 1, 2].map(
        (i) =>
          new THREE.MeshStandardMaterial({
            color: 0x0a1a22,
            emissive: i === 1 ? 0x5dff9a : 0x7fd1ff,
            emissiveIntensity: 2
          })
      ) as [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial, THREE.MeshStandardMaterial],
    []
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ledMats.forEach((m, i) => {
      m.emissiveIntensity = Math.sin(t * (7 + i * 4.3) + i * 2) > -0.2 ? 2.2 : 0.15
    })
  })

  return (
    <group>
      {[-0.38, 0.38].map((rx, ri) => (
        <group key={rx}>
          <mesh material={frame} position={[rx, 1.05, -0.05]}>
            <boxGeometry args={[0.72, 2.1, 0.95]} />
          </mesh>
          {Array.from({ length: 9 }, (_, u) => {
            const y = 0.22 + u * 0.205
            return (
              <group key={u}>
                <mesh material={unit} position={[rx, y, 0.43]}>
                  <boxGeometry args={[0.62, 0.17, 0.03]} />
                </mesh>
                <mesh material={unitFace} position={[rx, y, 0.4455]}>
                  <planeGeometry args={[0.62, 0.15]} />
                </mesh>
                {[0, 1, 2, 3].map((l) => (
                  <mesh key={l} material={ledMats[(u + l + ri) % 3] ?? ledMats[0]} position={[rx + 0.2 + l * 0.024, y, 0.448]}>
                    <boxGeometry args={[0.014, 0.014, 0.006]} />
                  </mesh>
                ))}
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}
