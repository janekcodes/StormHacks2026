'use client'

import type { Exhibit, Tier } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { canvasTexture, wrapText } from '../building/materials'
import { usePlayer } from '../player/usePlayer'
import { axisNear, CULL_M, faceYaw } from './focus'
import { footprintFor } from './footprint'
import { exhibitMaterials } from './materials'

function plaqueLine(tier: Tier): string {
  if (tier === 'built') return 'CLICK TO OPEN PORTAL'
  if (tier === 'core') return 'CORE · PORTAL IN DEVELOPMENT'
  if (tier === 'extended') return 'EXTENDED · PORTAL IN DEVELOPMENT'
  return 'OPEN SLOT · PORTAL IN DEVELOPMENT'
}

function drawPlaque(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  exhibit: Exhibit,
  ink: string
): void {
  g.fillStyle = '#fbfaf7'
  g.fillRect(0, 0, w, h)
  g.fillStyle = ink
  g.fillRect(0, 0, w, 10)
  g.font = '700 54px "Chakra Petch", sans-serif'
  g.fillText(exhibit.id, 28, 74)
  const idWidth = g.measureText(exhibit.id).width
  g.fillStyle = '#6a7078'
  g.font = '600 30px "IBM Plex Mono", monospace'
  g.fillText(exhibit.year, 28 + idWidth + 28, 72)
  g.fillStyle = '#1d2024'
  g.font = '700 36px "Chakra Petch", sans-serif'
  wrapText(g, exhibit.title, 28, 130, w - 56, 40)
  g.fillStyle = exhibit.tier === 'built' ? ink : '#6a7078'
  g.font = '600 22px "IBM Plex Mono", monospace'
  g.fillText(plaqueLine(exhibit.tier), 28, 256)
}

function plaqueLocal(exhibit: Exhibit): { x: number; y: number; z: number; rotX: number } {
  const fp = footprintFor(exhibit)
  if (exhibit.tier === 'built' && fp.floor) return { x: 0.75, y: 0.72, z: 1.25, rotX: -0.7 }
  if (exhibit.tier === 'built') return { x: 0, y: 0.8, z: 0.69, rotX: -0.35 }
  if (exhibit.tier === 'open') return { x: 0, y: 0.8, z: 0, rotX: -0.35 }
  return { x: 0, y: fp.h - 0.12, z: 0.47, rotX: -0.35 }
}

export function Plaque({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const geo = exhibitMaterials().plaqueGeo
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const parent = useMemo(() => new THREE.Object3D(), [])
  const child = useMemo(() => new THREE.Object3D(), [])
  const scratch = useMemo(() => new THREE.Matrix4(), [])
  const [fontTick, setFontTick] = useState(0)

  useEffect(() => {
    let alive = true
    const fonts = document.fonts
    if (!fonts?.ready) return
    void fonts.ready.then(() => {
      if (alive) setFontTick((n) => n + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  const materials = useMemo(() => {
    return exhibits.map((exhibit) => {
      const ink = zoneByCode(exhibit.zone)?.ink ?? '#4f5963'
      const map = canvasTexture(480, 280, (g, w, h) => drawPlaque(g, w, h, exhibit, ink))
      return new THREE.MeshStandardMaterial({ map, roughness: 0.6 })
    })
  }, [exhibits, fontTick])

  useEffect(() => {
    return () => {
      for (const material of materials) {
        material.map?.dispose()
        material.dispose()
      }
    }
  }, [materials])

  useLayoutEffect(() => {
    exhibits.forEach((exhibit, index) => {
      const mesh = meshes.current[index]
      if (!mesh) return
      const local = plaqueLocal(exhibit)
      parent.position.set(exhibit.position.x, 0, exhibit.position.z)
      parent.rotation.set(0, faceYaw(exhibit.position.face), 0)
      parent.scale.set(1, 1, 1)
      parent.updateMatrix()
      child.position.set(local.x, local.y, local.z)
      child.rotation.set(local.rotX, 0, 0)
      child.scale.set(1, 1, 1)
      child.updateMatrix()
      scratch.multiplyMatrices(parent.matrix, child.matrix)
      mesh.matrix.copy(scratch)
      mesh.matrixAutoUpdate = false
      mesh.visible = false
      mesh.updateMatrixWorld(true)
    })
  }, [child, exhibits, parent, scratch, materials])

  useFrame(() => {
    const { x, z } = usePlayer.getState()
    exhibits.forEach((exhibit, index) => {
      const mesh = meshes.current[index]
      if (!mesh) return
      mesh.visible = axisNear(x, z, exhibit.position.x, exhibit.position.z, CULL_M)
    })
  })

  return (
    <>
      {exhibits.map((exhibit, index) => {
        const material = materials[index]
        if (!material) return null
        return (
          <mesh
            key={exhibit.id}
            ref={(el) => {
              meshes.current[index] = el
            }}
            geometry={geo}
            material={material}
            dispose={null}
            frustumCulled={false}
          />
        )
      })}
    </>
  )
}
