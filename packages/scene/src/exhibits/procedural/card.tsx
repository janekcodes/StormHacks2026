'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

const ROWS = ['12', '11', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

function hollerith(ch: string): string[] {
  if (/[0-9]/.test(ch)) return [ch]
  if (/[A-I]/.test(ch)) return ['12', String(ch.charCodeAt(0) - 64)]
  if (/[J-R]/.test(ch)) return ['11', String(ch.charCodeAt(0) - 73)]
  if (/[S-Z]/.test(ch)) return ['0', String(ch.charCodeAt(0) - 81)]
  if (ch === '=') return ['6', '8']
  if (ch === '+') return ['12', '6', '8']
  return []
}

export function CardModel() {
  const M = proceduralMaterials()

  const cardTex = useMemo(
    () =>
      canvasTexture(1475, 650, (g, w, h) => {
        g.fillStyle = '#efe3c2'
        g.beginPath()
        g.moveTo(40, 0)
        g.lineTo(w, 0)
        g.lineTo(w, h)
        g.lineTo(0, h)
        g.lineTo(0, 40)
        g.closePath()
        g.fill()
        const line = '      ISUM = ISUM + I'
        const colW = (w - 60) / 80
        const rowH = (h - 110) / 12
        g.font = '600 15px "IBM Plex Mono", monospace'
        g.textAlign = 'center'
        for (let c = 0; c < 80; c++) {
          const ch = line.charAt(c) || ' '
          if (ch !== ' ') {
            g.fillStyle = '#2a2520'
            g.fillText(ch, 30 + (c + 0.5) * colW, 34)
          }
          const p = hollerith(ch)
          for (let r = 0; r < 12; r++) {
            const x = 30 + c * colW
            const y = 60 + r * rowH
            if (p.indexOf(ROWS[r] ?? '') >= 0) {
              g.fillStyle = '#121212'
              g.fillRect(x + 3, y + 6, colW - 6, rowH - 12)
            } else if (r >= 2) {
              g.fillStyle = 'rgba(107,90,64,0.55)'
              g.font = '11px "IBM Plex Mono", monospace'
              g.fillText(ROWS[r] ?? '', x + colW / 2, y + rowH / 2 + 4)
            }
          }
        }
        g.fillStyle = 'rgba(107,90,64,0.6)'
        g.fillRect(30 + 6 * colW, 44, 1.5, h - 60)
        g.fillRect(30 + 72 * colW, 44, 1.5, h - 60)
      }),
    []
  )
  const faceMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.85, transparent: true, alphaTest: 0.5 }),
    [cardTex]
  )
  const cardMesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.74, 0.326, 0.003)
    return new THREE.Mesh(geo, [M.ivory, M.ivory, M.ivory, M.ivory, faceMat, M.ivory])
  }, [M.ivory, faceMat])

  return (
    <group>
      <mesh material={M.blackGloss} position={[0, 0.015, 0]}>
        <boxGeometry args={[0.62, 0.03, 0.3]} />
      </mesh>
      <mesh material={M.brushed} position={[0, 0.17, -0.08]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.03, 0.34, 0.03]} />
      </mesh>
      <group position={[0, 0.2, 0.02]} rotation={[-0.35, 0, 0]}>
        <primitive object={cardMesh} />
      </group>
    </group>
  )
}
