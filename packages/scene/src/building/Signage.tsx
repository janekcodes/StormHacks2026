'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { canvasTexture, fontFamily, fontsReady, museumMaterials, wrapText } from './materials'
import { boxPart, mergeParts, type MergePart } from './merge'

const SIGN_W = 4.6
const SIGN_H = 0.98
const SIGN_Y = 4.0
const FACE_Z = 0.232

/** Raised lettering: a soft shadow under ivory text on dark walnut. */
function raised(g: CanvasRenderingContext2D): void {
  g.shadowColor = 'rgba(0, 0, 0, 0.55)'
  g.shadowOffsetX = 0
  g.shadowOffsetY = 4
  g.shadowBlur = 6
}

function useFontTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    void fontsReady().then(() => alive && setTick((n) => n + 1))
    return () => {
      alive = false
    }
  }, [])
  return tick
}

export function Signage({ building }: { building: Building }) {
  const fontTick = useFontTick()

  const signs = useMemo(() => {
    void fontTick
    const display = fontFamily('display')
    return building.signs.map((sg) => {
      const k = sg.k === 'Sx' ? 'S' : sg.k
      const z = building.zones[k]
      const title = sg.k === 'Sx' ? 'Society & Ethics · Future Lab' : (z?.name ?? k)
      const ink = z?.ink ?? '#1d2024'
      const tex = canvasTexture(1400, 300, (g, w, h) => {
        g.fillStyle = '#2a1a12'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#b8955a'
        g.lineWidth = 5
        g.strokeRect(14, 14, w - 28, h - 28)
        g.fillStyle = ink
        g.fillRect(44, 54, 192, 192)
        g.strokeStyle = '#d6b678'
        g.lineWidth = 4
        g.strokeRect(44, 54, 192, 192)
        raised(g)
        g.fillStyle = '#fbf6ea'
        g.font = `700 150px ${display}`
        g.textAlign = 'center'
        g.fillText(k, 140, 205)
        g.textAlign = 'left'
        g.fillStyle = '#d6b678'
        g.font = `700 44px ${display}`
        g.fillText(sg.k === 'Sx' ? 'FRONT GALLERY · EAST' : `WING ${k}`, 288, 108)
        g.fillStyle = '#f4ecdb'
        g.font = `700 70px ${display}`
        wrapText(g, title, 288, 196, 1060, 76)
      })
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
      return { tex, mat, x: sg.p[0], z: sg.p[1], rotY: Math.atan2(-sg.u[0], -sg.u[1]) }
    })
  }, [building, fontTick])

  const welcome = useMemo(() => {
    void fontTick
    const tex = canvasTexture(2048, 640, (g, w, h) => {
      g.fillStyle = '#2a1a12'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#b8955a'
      g.lineWidth = 8
      g.strokeRect(22, 22, w - 44, h - 44)
      raised(g)
      g.textAlign = 'center'
      g.fillStyle = '#f6eedc'
      g.font = `700 168px ${fontFamily('display')}`
      g.fillText('Hello Museum', w / 2, 250)
      g.shadowColor = 'transparent'
      g.fillStyle = '#c19a5b'
      g.fillRect(w / 2 - 160, 300, 320, 6)
      g.fillStyle = '#e2d6bd'
      g.font = `500 52px ${fontFamily('body')}`
      wrapText(g, 'A virtual museum showcasing major milestones in the history of Computer Science', w / 2, 410, 1560, 72)
    })
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
    return { tex, mat }
  }, [fontTick])

  /** Walnut backing boards and brass picture lights, merged. */
  const frames = useMemo(() => {
    const M = museumMaterials()
    const parts: MergePart[] = []
    const place = (x: number, z: number, rotY: number, lx: number, y: number, lz: number) => {
      const c = Math.cos(rotY)
      const s = Math.sin(rotY)
      return [x + lx * c + lz * s, y, z - lx * s + lz * c] as const
    }
    for (const sg of building.signs) {
      const rot = Math.atan2(-sg.u[0], -sg.u[1])
      const [bx, by, bz] = place(sg.p[0], sg.p[1], rot, 0, SIGN_Y, FACE_Z - 0.04)
      parts.push(boxPart(SIGN_W + 0.16, SIGN_H + 0.16, 0.07, M.wood, bx, by, bz, rot, false, true))
      const [hx, hy, hz] = place(sg.p[0], sg.p[1], rot, 0, SIGN_Y + SIGN_H / 2 + 0.16, FACE_Z + 0.12)
      parts.push(boxPart(SIGN_W * 0.7, 0.05, 0.12, M.brass, hx, hy, hz, rot, false, false))
      const [lx, ly, lz] = place(sg.p[0], sg.p[1], rot, 0, SIGN_Y + SIGN_H / 2 + 0.13, FACE_Z + 0.14)
      parts.push(boxPart(SIGN_W * 0.66, 0.012, 0.05, M.caseLight, lx, ly, lz, rot, false, false))
      for (const side of [-1, 1]) {
        const [ax, ay, az] = place(sg.p[0], sg.p[1], rot, side * SIGN_W * 0.3, SIGN_Y + SIGN_H / 2 + 0.12, FACE_Z + 0.04)
        parts.push(boxPart(0.02, 0.02, 0.16, M.brass, ax, ay, az, rot, false, false))
      }
    }
    parts.push(boxPart(5.6, 1.9, 0.08, M.wood, 0, 4.0, 14.54, 0, false, true))
    parts.push(boxPart(3.8, 0.05, 0.14, M.brass, 0, 5.02 - 0.06, 14.66, 0, false, false))
    return mergeParts(parts)
  }, [building])

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

  useEffect(() => () => frames.forEach((m) => m.geometry.dispose()), [frames])

  return (
    <>
      {frames.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} castShadow={m.castShadow} receiveShadow={m.receiveShadow} />
      ))}
      {signs.map((sg, i) => (
        <group key={i} position={[sg.x, 0, sg.z]} rotation={[0, sg.rotY, 0]}>
          <mesh position={[0, SIGN_Y, FACE_Z]} material={sg.mat}>
            <planeGeometry args={[SIGN_W, SIGN_H]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.0, 14.585]} material={welcome.mat}>
        <planeGeometry args={[5.4, 1.69]} />
      </mesh>
    </>
  )
}
