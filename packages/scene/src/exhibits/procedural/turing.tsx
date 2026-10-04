'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

const TAPE_SYMBOLS = ['_', '_', '1', '0', '1', '1', '_', '_'] as const

export function TuringModel() {
  const M = proceduralMaterials()
  const head = useRef<THREE.Group>(null)

  const tapeTex = useMemo(
    () =>
      canvasTexture(1024, 140, (g, w, h) => {
        g.fillStyle = '#efe3c2'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#8a7350'
        g.lineWidth = 3
        for (let i = 0; i <= 8; i++) {
          g.beginPath()
          g.moveTo((i * w) / 8, 0)
          g.lineTo((i * w) / 8, h)
          g.stroke()
        }
        g.fillStyle = '#2a2520'
        g.font = '96px "VT323", monospace'
        g.textAlign = 'center'
        TAPE_SYMBOLS.forEach((s, i) => g.fillText(s === '_' ? '' : s, ((i + 0.5) * w) / 8, 100))
      }),
    []
  )
  const tapeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.8, side: THREE.DoubleSide }),
    [tapeTex]
  )
  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.4, metalness: 0.4 }),
    []
  )
  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffb347,
        emissive: 0xff9a2a,
        emissiveIntensity: 1.6
      }),
    []
  )

  useFrame(({ clock }) => {
    const h = head.current
    if (!h) return
    const t = clock.elapsedTime
    const cell = Math.floor(t * 0.8) % 7
    const tx = -0.49 + (cell < 4 ? cell + 2 : 9 - cell) * 0.14
    h.position.x += (tx - h.position.x) * 0.12
  })

  return (
    <group>
      <mesh material={M.blackMatte} position={[0, 0.02, 0]}>
        <boxGeometry args={[1.4, 0.04, 0.42]} />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <group key={x}>
          <mesh material={M.brushed} position={[x, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.06, 40]} />
          </mesh>
          <mesh material={M.blackMatte} position={[x, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.07, 16]} />
          </mesh>
          <mesh material={M.blackMatte} position={[x, 0.08, -0.02]}>
            <boxGeometry args={[0.03, 0.12, 0.03]} />
          </mesh>
        </group>
      ))}
      <mesh material={tapeMat} position={[0, 0.16, 0.032]}>
        <planeGeometry args={[1.12, 0.155]} />
      </mesh>
      <group ref={head}>
        <mesh material={headMat} position={[0, 0.33, 0.03]}>
          <boxGeometry args={[0.15, 0.12, 0.12]} />
        </mesh>
        <mesh material={glowMat} position={[0, 0.35, 0.093]}>
          <boxGeometry args={[0.13, 0.02, 0.005]} />
        </mesh>
        <mesh material={M.brushed} position={[0, 0.255, 0.03]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.025, 0.05, 16]} />
        </mesh>
      </group>
    </group>
  )
}
