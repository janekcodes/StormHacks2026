'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

const WORDS = ['The', 'train', 'stopped', 'because', 'it', 'was', 'running', 'late'] as const
const WEIGHTS = [0.05, 0.55, 0.1, 0.06, 0.12, 0.05, 0.04, 0.03] as const

interface Token {
  word: string
  x: number
  weight: number
  labelMat: THREE.MeshStandardMaterial
}

export function TransformerModel() {
  const M = proceduralMaterials()

  const tokens = useMemo<Token[]>(
    () =>
      WORDS.map((word, i) => {
        const tex = canvasTexture(256, 64, (g, w) => {
          g.fillStyle = '#d9eef8'
          g.font = '500 34px "IBM Plex Mono", monospace'
          g.textAlign = 'center'
          g.fillText(word, w / 2, 44)
        })
        return {
          word,
          x: -0.49 + i * 0.14,
          weight: WEIGHTS[i] ?? 0,
          labelMat: new THREE.MeshStandardMaterial({ map: tex, transparent: true })
        }
      }),
    []
  )

  const orbMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xe9f7ff, emissive: 0x7fd1ff, emissiveIntensity: 0.5, roughness: 0.15 }),
    []
  )
  const hot = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x7fd1ff, emissiveIntensity: 1.6, roughness: 0.1 }),
    []
  )

  const arcs = useMemo(() => {
    const center = tokens[4]?.x ?? 0.07
    const out: {
      geometry: THREE.TubeGeometry
      material: THREE.MeshStandardMaterial
      weight: number
    }[] = []
    tokens.forEach((token, i) => {
      if (i === 4) return
      const a = new THREE.Vector3(center, 0.12, 0)
      const b = new THREE.Vector3(token.x, 0.12, 0)
      const hgt = 0.12 + Math.abs(i - 4) * 0.07
      const curve = new THREE.QuadraticBezierCurve3(
        a,
        new THREE.Vector3((center + token.x) / 2, 0.12 + hgt * 2, 0),
        b
      )
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7fd1ff,
        emissive: 0x7fd1ff,
        emissiveIntensity: 0.6 + token.weight * 3,
        transparent: true,
        opacity: 0.35 + token.weight * 1.1,
        roughness: 0.3
      })
      out.push({
        geometry: new THREE.TubeGeometry(curve, 48, 0.002 + token.weight * 0.012, 8),
        material: mat,
        weight: token.weight
      })
    })
    return out
  }, [tokens])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    arcs.forEach((arc, i) => {
      arc.material.emissiveIntensity = 0.5 + arc.weight * 3 + 0.25 * Math.sin(t * 2 + i)
    })
  })

  return (
    <group>
      <mesh material={M.blackGloss} position={[0, 0.02, 0]}>
        <boxGeometry args={[1.2, 0.04, 0.32]} />
      </mesh>
      {tokens.map((token, i) => (
        <group key={i}>
          <mesh material={i === 4 ? hot : orbMat} position={[token.x, 0.09, 0]}>
            <sphereGeometry args={[i === 4 ? 0.04 : 0.03, 32, 20]} />
          </mesh>
          <mesh material={token.labelMat} position={[token.x, 0.045, 0.14]} rotation={[-0.9, 0, 0]}>
            <planeGeometry args={[0.13, 0.0325]} />
          </mesh>
        </group>
      ))}
      {arcs.map((arc, i) => (
        <mesh key={i} geometry={arc.geometry} material={arc.material} />
      ))}
    </group>
  )
}
