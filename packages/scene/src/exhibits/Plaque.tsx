'use client'

import type { Exhibit, Tier } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { cellOffsets, withAtlasCells } from '../building/atlas'
import { fontFamily, fontsReady, wrapText } from '../building/materials'
import { usePlayer } from '../player/usePlayer'
import { axisNear, CULL_M, faceYaw } from './focus'
import { exhibitMaterials } from './materials'
import { plaqueLocal } from './stands'

const CELL_W = 448
const CELL_H = 268
const COLS = 8

function plaqueLine(tier: Tier): string {
  if (tier === 'built') return 'Interactive · press E or click'
  if (tier === 'core') return 'Core collection'
  if (tier === 'extended') return 'Extended collection'
  return 'Open slot'
}

/** Engraved-label look: warm ivory card, zone rule, ID and year, title, status line. */
function drawPlaque(
  g: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  exhibit: Exhibit,
  ink: string
): void {
  const w = CELL_W
  const h = CELL_H
  const display = fontFamily('display')
  const body = fontFamily('body')
  g.save()
  g.translate(ox, oy)
  g.beginPath()
  g.rect(0, 0, w, h)
  g.clip()
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#f7f1e3')
  grad.addColorStop(1, '#ebe2cf')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  g.strokeStyle = 'rgba(120, 92, 48, 0.55)'
  g.lineWidth = 3
  g.strokeRect(10, 10, w - 20, h - 20)
  g.fillStyle = ink
  g.fillRect(26, 26, 6, 58)
  g.fillStyle = '#1d2024'
  g.font = `700 46px ${display}`
  g.fillText(exhibit.id, 44, 70)
  const idWidth = g.measureText(exhibit.id).width
  g.fillStyle = '#5b6168'
  g.font = `500 26px ${body}`
  g.fillText(exhibit.year, 44 + idWidth + 20, 68)
  g.fillStyle = '#1d2024'
  g.font = `700 32px ${display}`
  wrapText(g, exhibit.title, 28, 130, w - 56, 36)
  g.fillStyle = exhibit.tier === 'built' ? ink : '#5b6168'
  g.font = `500 19px ${body}`
  g.fillText(plaqueLine(exhibit.tier).toUpperCase(), 28, h - 30)
  g.restore()
}

function makeAtlas(exhibits: readonly Exhibit[]): THREE.CanvasTexture {
  const rows = Math.ceil(exhibits.length / COLS)
  const c = document.createElement('canvas')
  c.width = CELL_W * COLS
  c.height = CELL_H * rows
  const g = c.getContext('2d')
  if (!g) throw new Error('2d context unavailable')
  exhibits.forEach((exhibit, i) => {
    const ink = zoneByCode(exhibit.zone)?.ink ?? '#4f5963'
    drawPlaque(g, (i % COLS) * CELL_W, Math.floor(i / COLS) * CELL_H, exhibit, ink)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.flipY = true
  return tex
}

/** Every exhibit label in one atlas texture and one instanced draw call. */
export function Plaque({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const [fontTick, setFontTick] = useState(0)
  const rows = Math.ceil(exhibits.length / COLS)

  useEffect(() => {
    let alive = true
    void fontsReady().then(() => {
      if (alive) setFontTick((n) => n + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  const geometry = useMemo(() => {
    const geo = exhibitMaterials().plaqueGeo.clone()
    geo.setAttribute('cellOffset', cellOffsets(exhibits.length, COLS, rows))
    return geo
  }, [exhibits, rows])

  const material = useMemo(() => {
    void fontTick
    const m = new THREE.MeshStandardMaterial({ map: makeAtlas(exhibits), roughness: 0.55 })
    return withAtlasCells(m, COLS, rows, 'plaque-atlas')
  }, [exhibits, rows, fontTick])

  const matrices = useMemo(
    () =>
      exhibits.map((exhibit) => {
        const local = plaqueLocal(exhibit)
        const parent = new THREE.Matrix4().makeRotationY(faceYaw(exhibit.position.face))
        parent.setPosition(exhibit.position.x, 0, exhibit.position.z)
        const child = new THREE.Matrix4().makeRotationX(local.rotX)
        child.setPosition(local.x, local.y, local.z)
        return parent.multiply(child)
      }),
    [exhibits]
  )
  const visible = useRef<boolean[]>([])
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), [])

  useEffect(() => {
    return () => {
      material.map?.dispose()
      material.dispose()
    }
  }, [material])

  useEffect(() => () => geometry.dispose(), [geometry])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    visible.current = exhibits.map(() => true)
  }, [matrices, exhibits, material])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const { x, z } = usePlayer.getState()
    let dirty = false
    exhibits.forEach((exhibit, i) => {
      const near = axisNear(x, z, exhibit.position.x, exhibit.position.z, CULL_M)
      if (visible.current[i] !== near) {
        visible.current[i] = near
        mesh.setMatrixAt(i, near ? (matrices[i] ?? zero) : zero)
        dirty = true
      }
    })
    if (dirty) mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, exhibits.length]} dispose={null} />
}
