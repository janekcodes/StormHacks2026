'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { cellOffsets, withAtlasCells } from './atlas'
import { canvasTexture, fontFamily, fontsReady, museumMaterials, wrapText } from './materials'
import { boxPart, mergeParts, type MergePart } from './merge'

const SIGN_W = 4.6
const SIGN_H = 0.98
const SIGN_Y = 4.0
const FACE_Z = 0.232
const CELL_W = 1400
const CELL_H = 300
const COLS = 4

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

function drawWingSign(
  g: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  k: string,
  title: string,
  ink: string,
  subtitle: string
): void {
  const display = fontFamily('display')
  g.save()
  g.translate(ox, oy)
  g.fillStyle = '#2a1a12'
  g.fillRect(0, 0, CELL_W, CELL_H)
  g.strokeStyle = '#b8955a'
  g.lineWidth = 5
  g.strokeRect(14, 14, CELL_W - 28, CELL_H - 28)
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
  g.fillText(subtitle, 288, 108)
  g.fillStyle = '#f4ecdb'
  g.font = `700 70px ${display}`
  wrapText(g, title, 288, 196, 1060, 76)
  g.restore()
}

export function Signage({ building }: { building: Building }) {
  const fontTick = useFontTick()
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const rows = Math.ceil(building.signs.length / COLS)

  const atlas = useMemo(() => {
    void fontTick
    const c = document.createElement('canvas')
    c.width = CELL_W * COLS
    c.height = CELL_H * rows
    const g = c.getContext('2d')
    if (!g) throw new Error('2d context unavailable')
    building.signs.forEach((sg, i) => {
      const k = sg.k === 'Sx' ? 'S' : sg.k
      const z = building.zones[k]
      const title = sg.k === 'Sx' ? 'Society & Ethics · Future Lab' : (z?.name ?? k)
      const ink = z?.ink ?? '#1d2024'
      const subtitle = sg.k === 'Sx' ? 'FRONT GALLERY · EAST' : `WING ${k}`
      drawWingSign(g, (i % COLS) * CELL_W, Math.floor(i / COLS) * CELL_H, k, title, ink, subtitle)
    })
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const mat = withAtlasCells(
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }),
      COLS,
      rows,
      'wing-signs'
    )
    const geo = new THREE.PlaneGeometry(SIGN_W, SIGN_H)
    geo.setAttribute('cellOffset', cellOffsets(building.signs.length, COLS, rows))
    const matrices = building.signs.map((sg) => {
      const rotY = Math.atan2(-sg.u[0], -sg.u[1])
      const m = new THREE.Matrix4().makeRotationY(rotY)
      const c = Math.cos(rotY)
      const s = Math.sin(rotY)
      m.setPosition(sg.p[0] + FACE_Z * s, SIGN_Y, sg.p[1] + FACE_Z * c)
      return m
    })
    return { tex, mat, geo, matrices }
  }, [building, rows, fontTick])

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

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    atlas.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [atlas])

  useEffect(() => {
    return () => {
      atlas.tex.dispose()
      atlas.mat.dispose()
      atlas.geo.dispose()
      welcome.tex.dispose()
      welcome.mat.dispose()
    }
  }, [atlas, welcome])

  useEffect(() => () => frames.forEach((m) => m.geometry.dispose()), [frames])

  return (
    <>
      {frames.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} castShadow={m.castShadow} receiveShadow={m.receiveShadow} />
      ))}
      <instancedMesh
        ref={meshRef}
        args={[atlas.geo, atlas.mat, building.signs.length]}
        dispose={null}
      />
      <mesh position={[0, 4.0, 14.585]} material={welcome.mat}>
        <planeGeometry args={[5.4, 1.69]} />
      </mesh>
    </>
  )
}
