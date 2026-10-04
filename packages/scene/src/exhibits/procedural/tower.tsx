'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'

interface TowerBlock {
  label: string
  w: number
  h: number
  d: number
  color: number
}

const BLOCKS: readonly TowerBlock[] = [
  { label: 'JS FRAMEWORK', w: 1.2, h: 0.42, d: 0.8, color: 0x4fb6e6 },
  { label: 'IMAGES', w: 1.1, h: 0.38, d: 0.74, color: 0x2f7fa6 },
  { label: 'JS BUNDLE', w: 1.0, h: 0.36, d: 0.68, color: 0x7fd1ff },
  { label: 'FONTS', w: 0.9, h: 0.32, d: 0.6, color: 0x1f5f80 },
  { label: 'TRACKERS', w: 0.8, h: 0.3, d: 0.54, color: 0x5fb2d6 },
  { label: 'CSS', w: 0.68, h: 0.26, d: 0.48, color: 0x174a63 },
  { label: 'TEXT', w: 0.32, h: 0.12, d: 0.22, color: 0xf2f4f6 }
]

const DARK_COLORS = new Set<number>([0x174a63, 0x1f5f80, 0x2f7fa6])

export function TowerModel() {
  const blocks = useMemo(() => {
    let y = 0
    return BLOCKS.map((b, i) => {
      const dark = DARK_COLORS.has(b.color)
      const tex = canvasTexture(512, 128, (g, w) => {
        g.fillStyle = dark ? '#eaf6fd' : '#06222e'
        g.font = '700 60px "Chakra Petch", sans-serif'
        g.textAlign = 'center'
        g.fillText(b.label, w / 2, 84)
      })
      const item = {
        b,
        mat: new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.28, metalness: 0.05 }),
        label: new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4 }),
        y: y + b.h / 2,
        rotY: (i % 2 ? 0.07 : -0.05) * (i ? 1 : 0)
      }
      y += b.h
      return item
    })
  }, [])

  return (
    <group>
      {blocks.map((item, i) => (
        <group key={i} position={[(i % 2 ? 0.04 : -0.03) * (i ? 1 : 0), item.y, 0]} rotation={[0, item.rotY, 0]}>
          <mesh material={item.mat}>
            <boxGeometry args={[item.b.w, item.b.h, item.b.d]} />
          </mesh>
          <mesh material={item.label} position={[0, 0, item.b.d / 2 + 0.002]}>
            <planeGeometry args={[Math.min(item.b.w * 0.9, 0.9), Math.min(item.b.w * 0.9, 0.9) / 4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
