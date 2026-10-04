'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture, wrapText } from './materials'

export function Signage({ building }: { building: Building }) {
  const signs = useMemo(() => {
    const zones = building.zones
    return building.signs.map((sg) => {
      const k = sg.k === 'Sx' ? 'S' : sg.k
      const z = zones[k]
      const title =
        sg.k === 'Sx' ? 'Society & Ethics · Future Lab' : (z?.name ?? k)
      const ink = z?.ink ?? '#1d2024'
      const tex = canvasTexture(1400, 300, (g, w, h) => {
        g.fillStyle = '#fbfaf7'
        g.fillRect(0, 0, w, h)
        g.fillStyle = ink
        g.fillRect(40, 50, 200, 200)
        g.fillStyle = '#ffffff'
        g.font = '700 150px "Chakra Petch", sans-serif'
        g.textAlign = 'center'
        g.fillText(sg.k === 'Sx' ? 'S' : k, 140, 205)
        g.textAlign = 'left'
        g.fillStyle = ink
        g.font = '700 46px "Chakra Petch", sans-serif'
        g.fillText(sg.k === 'Sx' ? 'FRONT GALLERY · EAST' : `WING ${k}`, 290, 110)
        g.fillStyle = '#1d2024'
        g.font = '700 74px "Chakra Petch", sans-serif'
        wrapText(g, title, 290, 200, 1060, 80)
      })
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })
      return {
        tex,
        mat,
        x: sg.p[0],
        z: sg.p[1],
        rotY: Math.atan2(-sg.u[0], -sg.u[1])
      }
    })
  }, [building])

  const welcome = useMemo(() => {
    const tex = canvasTexture(2048, 420, (g, w, h) => {
      g.fillStyle = '#fbfaf7'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#ffb347'
      g.fillRect(0, h - 18, w, 18)
      g.fillStyle = '#1d2024'
      g.textAlign = 'center'
      g.font = '700 150px "Chakra Petch", sans-serif'
      g.fillText('THE NeXT-Gen MUSEUM', w / 2, 190)
      g.fillStyle = '#5a6068'
      g.font = '500 54px "IBM Plex Mono", monospace'
      g.fillText('COMPUTER SCIENCE WING  ·  ATRIUM AND ALL WINGS AHEAD', w / 2, 300)
    })
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })
    return { tex, mat }
  }, [])

  useEffect(() => {
    return () => {
      for (const s of signs) {
        s.tex.dispose()
        s.mat.dispose()
      }
      welcome.tex.dispose()
      welcome.mat.dispose()
    }
  }, [signs, welcome])

  return (
    <>
      {signs.map((sg, i) => (
        <group key={i} position={[sg.x, 0, sg.z]} rotation={[0, sg.rotY, 0]}>
          <mesh position={[0, 4.2, 0.2]} material={sg.mat}>
            <planeGeometry args={[4.6, 0.98]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.05, 24.3]} material={welcome.mat}>
        <planeGeometry args={[7, 1.44]} />
      </mesh>
    </>
  )
}
