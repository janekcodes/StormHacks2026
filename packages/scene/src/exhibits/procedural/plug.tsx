'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

const CABLE_COLORS = [0xffb347, 0xe8563a, 0x4aa8e8, 0xf2f2ee, 0x5fcf7f]
const CABLE_PAIRS: readonly (readonly [number, number])[] = [
  [0, 8],
  [1, 9],
  [4, 6],
  [5, 11],
  [2, 10]
]

export function PlugModel() {
  const M = proceduralMaterials()
  const cab = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x2f2b27, roughness: 0.55, metalness: 0.35 }), [])

  const jacks = useMemo(() => {
    const out: [number, number][] = []
    for (let row = 0; row < 2; row++) {
      for (let c = 0; c < 6; c++) {
        out.push([-0.65 + c * 0.26, row === 0 ? 1.78 : 1.12])
      }
    }
    return out
  }, [])

  const cables = useMemo(() => {
    return CABLE_PAIRS.map((pair, i) => {
      const a = jacks[pair[0]]
      const b = jacks[pair[1]]
      if (!a || !b) return null
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a[0], a[1], 0.07),
        new THREE.Vector3(a[0], a[1] - 0.05, 0.25),
        new THREE.Vector3((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 0.42 - i * 0.03, 0.34 + i * 0.02),
        new THREE.Vector3(b[0], b[1] - 0.05, 0.25),
        new THREE.Vector3(b[0], b[1], 0.07)
      ])
      return {
        geometry: new THREE.TubeGeometry(curve, 64, 0.016, 10),
        material: new THREE.MeshStandardMaterial({ color: CABLE_COLORS[i] ?? 0xffffff, roughness: 0.45 })
      }
    })
  }, [jacks])

  const labelTex = useMemo(
    () =>
      canvasTexture(1024, 80, (g) => {
        g.fillStyle = '#e8d9bb'
        g.font = '600 40px "Chakra Petch", sans-serif'
        g.textAlign = 'center'
        ;['ACC 1', 'ACC 2', 'ACC 3', 'ACC 4', 'MULT', 'PRINT'].forEach((s, i) =>
          g.fillText(s, ((0.5 + i) * 1024) / 6.4 + 22, 55)
        )
      }),
    []
  )
  const labelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: labelTex, transparent: true }),
    [labelTex]
  )

  return (
    <group>
      <mesh material={M.blackMatte} position={[-0.75, 0.425, 0]}>
        <boxGeometry args={[0.06, 0.85, 0.06]} />
      </mesh>
      <mesh material={M.blackMatte} position={[0.75, 0.425, 0]}>
        <boxGeometry args={[0.06, 0.85, 0.06]} />
      </mesh>
      <mesh material={cab} position={[0, 1.45, 0]}>
        <boxGeometry args={[1.75, 1.2, 0.09]} />
      </mesh>
      {jacks.map(([x, y], i) => (
        <group key={i}>
          <mesh material={M.steel} position={[x, y, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 20]} />
          </mesh>
          <mesh material={M.blackGloss} position={[x, y, 0.058]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.022, 16]} />
          </mesh>
        </group>
      ))}
      <mesh material={labelMat} position={[0, 1.94, 0.047]}>
        <planeGeometry args={[1.6, 0.12]} />
      </mesh>
      {cables.map(
        (cable, i) =>
          cable && (
            <mesh key={i} geometry={cable.geometry} material={cable.material} />
          )
      )}
    </group>
  )
}
