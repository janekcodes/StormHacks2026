'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo } from 'react'
import type { Material } from 'three'
import { applyLightmap, useLightmap } from '../lighting/lightmap'
import { makeMaterials } from './materials'
import { boxPart, mergeParts, type MergedMesh } from './merge'

function wallBox(
  s: readonly [number, number, number, number],
  y0: number,
  y1: number,
  mat: Material,
  thick: number,
  castShadow: boolean,
  receiveShadow: boolean,
  parts: ReturnType<typeof boxPart>[]
) {
  const dx = s[2] - s[0]
  const dz = s[3] - s[1]
  const L = Math.hypot(dx, dz)
  parts.push(
    boxPart(
      L + thick * 0.5,
      y1 - y0,
      thick,
      mat,
      (s[0] + s[2]) / 2,
      (y0 + y1) / 2,
      (s[1] + s[3]) / 2,
      -Math.atan2(dz, dx),
      castShadow,
      receiveShadow
    )
  )
}

export function Walls({ building }: { building: Building }) {
  const mats = useMemo(() => makeMaterials(), [])
  const meshes = useMemo(() => {
    const parts: ReturnType<typeof boxPart>[] = []
    const M = mats

    for (const s of building.walls) {
      const seg: [number, number, number, number] = [s[0], s[1], s[2], s[3]]
      if (s[4] === 'ext') {
        wallBox(seg, 0, 0.9, M.wall, 0.3, true, true, parts)
        wallBox(seg, 4.2, 5, M.wall, 0.3, true, true, parts)
        wallBox(seg, 0.9, 4.2, M.glass, 0.06, false, false, parts)
        const dx = s[2] - s[0]
        const dz = s[3] - s[1]
        const L = Math.hypot(dx, dz)
        const n = Math.max(1, Math.round(L / 3))
        for (let i = 0; i <= n; i++) {
          const t = i / n
          parts.push(
            boxPart(
              0.08,
              3.3,
              0.12,
              M.frame,
              s[0] + dx * t,
              2.55,
              s[1] + dz * t,
              -Math.atan2(dz, dx),
              true,
              true
            )
          )
        }
      } else {
        wallBox(seg, 0, 5, M.wall, 0.3, true, true, parts)
      }
      wallBox(seg, 0, 0.12, M.base, 0.34, false, true, parts)
    }

    for (const s of building.lintels) {
      wallBox(s, 3.4, 5, M.wall, 0.3, true, true, parts)
    }

    for (const s of building.glass) {
      wallBox(s, 0, 5, M.glass, 0.05, false, false, parts)
      wallBox(s, 0, 0.1, M.frame, 0.1, true, true, parts)
      wallBox(s, 4.9, 5.0, M.frame, 0.1, true, true, parts)
      for (const p of [
        [s[0], s[1]],
        [s[2], s[3]]
      ] as const) {
        parts.push(boxPart(0.1, 5, 0.1, M.frame, p[0], 2.5, p[1], 0, true, true))
      }
    }

    const atr = building.rooms.find((r) => r.key === 'Atr')
    if (atr) {
      atr.poly.forEach((p, i) => {
        const q = atr.poly[(i + 1) % atr.poly.length]
        if (!q) return
        wallBox([p[0], p[1], q[0], q[1]], 5, 7.5, M.glass, 0.05, false, false, parts)
      })
    }

    return mergeParts(parts)
  }, [building, mats])

  const atlas = useLightmap((s) => s.atlas)

  useEffect(() => {
    if (!atlas) return
    for (const m of meshes) {
      if (m.material === mats.wall || m.material === mats.base) {
        applyLightmap(m.material, m.geometry, atlas)
      }
    }
  }, [atlas, meshes, mats])

  useEffect(() => {
    return () => {
      for (const m of meshes) m.geometry.dispose()
      for (const mat of Object.values(mats)) mat.dispose()
    }
  }, [meshes, mats])

  return (
    <>
      {meshes.map((m: MergedMesh, i) => (
        <mesh
          key={i}
          geometry={m.geometry}
          material={m.material}
          castShadow={m.castShadow}
          receiveShadow={m.receiveShadow}
        />
      ))}
    </>
  )
}
