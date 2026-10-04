'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

export function ChalkModel() {
  const M = proceduralMaterials()

  const boardTex = useMemo(
    () =>
      canvasTexture(1600, 1000, (g, w, h) => {
        g.fillStyle = '#23402f'
        g.fillRect(0, 0, w, h)
        for (let i = 0; i < 3000; i++) {
          g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`
          g.fillRect(Math.random() * w, Math.random() * h, 3, 1)
        }
        g.fillStyle = 'rgba(240,244,238,0.92)'
        g.font = '150px "VT323", monospace'
        g.fillText('ARTIFICIAL', 90, 230)
        g.fillText('INTELLIGENCE', 90, 370)
        g.font = '64px "VT323", monospace'
        g.fillStyle = 'rgba(230,236,228,0.85)'
        g.fillText('Dartmouth College · Summer 1956', 90, 480)
        g.fillText('McCarthy · Minsky · Rochester · Shannon', 90, 570)
        g.strokeStyle = 'rgba(240,244,238,0.8)'
        g.lineWidth = 5
        const nodes: [number, number][] = [
          [1150, 200],
          [1400, 300],
          [1150, 400],
          [1400, 500],
          [1250, 650]
        ]
        const edges: [number, number][] = [
          [0, 1],
          [0, 3],
          [2, 1],
          [2, 3],
          [1, 4],
          [3, 4]
        ]
        for (const [a, b] of edges) {
          const na = nodes[a]
          const nb = nodes[b]
          if (!na || !nb) continue
          g.beginPath()
          g.moveTo(na[0], na[1])
          g.lineTo(nb[0], nb[1])
          g.stroke()
        }
        for (const n of nodes) {
          g.beginPath()
          g.arc(n[0], n[1], 30, 0, Math.PI * 2)
          g.stroke()
        }
        g.font = '58px "VT323", monospace'
        g.fillText('Logic Theorist: 38 / 52 proofs', 90, 840)
      }),
    []
  )
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.92 }), [boardTex])

  return (
    <group>
      {(
        [
          [-0.55, 0.15],
          [0.55, 0.15]
        ] as [number, number][]
      ).map(([x, z]) => (
        <mesh key={x} material={M.wood} position={[x, 1.0, z]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.05, 2.0, 0.05]} />
        </mesh>
      ))}
      <mesh material={M.wood} position={[0, 0.95, -0.25]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[0.05, 1.9, 0.05]} />
      </mesh>
      <group position={[0, 1.42, 0.08]} rotation={[-0.12, 0, 0]}>
        <mesh material={M.wood}>
          <boxGeometry args={[1.7, 1.12, 0.05]} />
        </mesh>
        <mesh material={faceMat} position={[0, 0, 0.026]}>
          <planeGeometry args={[1.58, 1.0]} />
        </mesh>
        <mesh material={M.wood} position={[0, -0.56, 0.05]}>
          <boxGeometry args={[1.6, 0.04, 0.08]} />
        </mesh>
      </group>
    </group>
  )
}
