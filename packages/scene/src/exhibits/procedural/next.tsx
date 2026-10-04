'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'

export function NextModel() {
  const mag = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.48, metalness: 0.25 }), [])
  const beige = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xd8d0bf, roughness: 0.55 }), [])

  const screenTex = useMemo(
    () =>
      canvasTexture(800, 600, (g) => {
        g.fillStyle = '#d9dcdf'
        g.fillRect(0, 0, 800, 600)
        g.fillStyle = '#9ea3a8'
        g.fillRect(0, 0, 800, 36)
        g.fillStyle = '#111'
        g.font = '600 22px "IBM Plex Mono", monospace'
        g.fillText('WorldWideWeb', 20, 25)
        g.font = '700 52px Times, serif'
        g.fillText('World Wide Web', 40, 110)
        g.font = '24px Times, serif'
        let y = 160
        const body = [
          'The WorldWideWeb (W3) is a wide-area',
          'hypermedia information retrieval',
          'initiative aiming to give universal',
          'access to a large universe of documents.'
        ]
        for (const l of body) {
          g.fillText(l, 40, y)
          y += 34
        }
        g.fillStyle = '#333'
        const links = ['What’s out there?', 'Help', 'Software Products', 'Technical']
        for (const l of links) {
          g.fillText(`• ${l}`, 60, y + 20)
          g.fillRect(84, y + 25, g.measureText(l).width, 2)
          y += 40
        }
      }),
    []
  )
  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: screenTex,
        emissiveMap: screenTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
        roughness: 0.25
      }),
    [screenTex]
  )
  const leds = useMemo(
    () =>
      [0, 1, 2].map((i) =>
        new THREE.MeshStandardMaterial({
          color: 0x113311,
          emissive: i === 2 ? 0xffa030 : 0x40ff80,
          emissiveIntensity: 1.5
        })
      ),
    []
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    leds.forEach((m, i) => {
      m.emissiveIntensity = Math.sin(t * (5 + i * 3.1) + i) > 0 ? 1.8 : 0.1
    })
  })

  return (
    <group>
      <mesh material={mag} position={[-0.36, 0.15, -0.05]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
      </mesh>
      <mesh material={mag} position={[0.16, 0.07, -0.05]}>
        <cylinderGeometry args={[0.035, 0.035, 0.12, 20]} />
      </mesh>
      <mesh material={mag} position={[0.16, 0.01, -0.05]}>
        <boxGeometry args={[0.26, 0.02, 0.2]} />
      </mesh>
      <mesh material={mag} position={[0.16, 0.32, -0.05]}>
        <boxGeometry args={[0.48, 0.38, 0.3]} />
      </mesh>
      <mesh material={screenMat} position={[0.16, 0.33, 0.101]}>
        <planeGeometry args={[0.4, 0.3]} />
      </mesh>
      <mesh material={mag} position={[0.12, 0.011, 0.3]}>
        <boxGeometry args={[0.46, 0.022, 0.15]} />
      </mesh>
      <mesh material={beige} position={[-0.4, 0.025, 0.3]}>
        <boxGeometry args={[0.2, 0.05, 0.15]} />
      </mesh>
      {leds.map((m, i) => (
        <mesh key={i} material={m} position={[-0.46 + i * 0.03, 0.035, 0.376]}>
          <boxGeometry args={[0.012, 0.008, 0.004]} />
        </mesh>
      ))}
    </group>
  )
}
