'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { applyLightmap, useLightmap } from '../lighting/lightmap'
import { roomAt } from '../rooms'
import { museumMaterials } from './materials'
import { boxPart, mergeParts, type MergedMesh, type MergePart } from './merge'

type Seg = readonly [number, number, number, number]

const PUBLIC_ROOMS = new Set(['Atr', 'Conc', 'Foyer', 'Shop'])

/** Wall heights (m). The ceiling is at 5 m (BLUEPRINT section 5). */
const SKIRT = 0.18
const DADO = 1.1
const RAIL = 0.05
const FRIEZE_Y = 4.05
const FRIEZE_H = 0.22

function segBox(
  s: Seg,
  y0: number,
  y1: number,
  mat: THREE.Material,
  depth: number,
  parts: MergePart[],
  opts: { cast?: boolean; receive?: boolean; extend?: number; offset?: number; color?: THREE.Color } = {}
): void {
  const dx = s[2] - s[0]
  const dz = s[3] - s[1]
  const L = Math.hypot(dx, dz)
  if (L < 1e-3) return
  const nx = -dz / L
  const nz = dx / L
  const off = opts.offset ?? 0
  const part = boxPart(
    L + (opts.extend ?? 0),
    y1 - y0,
    depth,
    mat,
    (s[0] + s[2]) / 2 + nx * off,
    (y0 + y1) / 2,
    (s[1] + s[3]) / 2 + nz * off,
    -Math.atan2(dz, dx),
    opts.cast ?? false,
    opts.receive ?? true
  )
  if (opts.color) part.color = opts.color
  parts.push(part)
}

/** Stepped crown cornice under the 5 m ceiling. */
function cornice(s: Seg, thick: number, parts: MergePart[], extend: number): void {
  const M = museumMaterials()
  segBox(s, 4.9, 5, M.trim, thick + 0.2, parts, { extend: extend + 0.2 })
  segBox(s, 4.8, 4.9, M.trim, thick + 0.12, parts, { extend: extend + 0.12 })
  segBox(s, 4.74, 4.8, M.trim, thick + 0.06, parts, { extend: extend + 0.06 })
}

/** Ink colour of the gallery a wall face looks into, toned down to read as paint. */
function friezeColour(building: Building, s: Seg, side: 1 | -1): THREE.Color | null {
  const dx = s[2] - s[0]
  const dz = s[3] - s[1]
  const L = Math.hypot(dx, dz) || 1
  const mx = (s[0] + s[2]) / 2 + (-dz / L) * 0.6 * side
  const mz = (s[1] + s[3]) / 2 + (dx / L) * 0.6 * side
  const room = roomAt(building, mx, mz)
  if (!room || PUBLIC_ROOMS.has(room.key)) return null
  return new THREE.Color(room.ink).lerp(new THREE.Color(0x2a2520), 0.18)
}

export function buildWallParts(building: Building): MergePart[] {
  const M = museumMaterials()
  const parts: MergePart[] = []

  for (const w of building.walls) {
    const s: Seg = [w[0], w[1], w[2], w[3]]
    const thick = 0.3
    const ext = thick * 0.5
    if (w[4] === 'ext') {
      segBox(s, 0, 0.9, M.plaster, thick, parts, { cast: true, extend: ext })
      segBox(s, 4.2, 5, M.plaster, thick, parts, { cast: true, extend: ext })
      segBox(s, 0.9, 4.2, M.glass, 0.04, parts, { receive: false, extend: ext })
      segBox(s, 0, SKIRT, M.wood, thick + 0.04, parts, { extend: ext + 0.04 })
      segBox(s, 0.88, 0.94, M.wood, thick + 0.1, parts, { extend: ext + 0.1 })
      segBox(s, 4.16, 4.22, M.bronze, thick + 0.04, parts, { extend: ext })
      cornice(s, thick, parts, ext)
      const dx = s[2] - s[0]
      const dz = s[3] - s[1]
      const L = Math.hypot(dx, dz)
      const n = Math.max(1, Math.round(L / 3))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        parts.push(
          boxPart(0.09, 3.3, 0.14, M.bronze, s[0] + dx * t, 2.55, s[1] + dz * t, -Math.atan2(dz, dx), true, true)
        )
      }
    } else {
      segBox(s, 0, 5, M.plaster, thick, parts, { cast: true, extend: ext })
      segBox(s, SKIRT, DADO, M.panel, thick + 0.03, parts, { extend: ext + 0.03 })
      segBox(s, 0, SKIRT, M.wood, thick + 0.05, parts, { extend: ext + 0.05 })
      segBox(s, DADO, DADO + RAIL, M.wood, thick + 0.07, parts, { extend: ext + 0.07 })
      cornice(s, thick, parts, ext)
      for (const side of [1, -1] as const) {
        const color = friezeColour(building, s, side)
        if (!color) continue
        segBox(s, FRIEZE_Y, FRIEZE_Y + FRIEZE_H, M.frieze, 0.006, parts, {
          extend: ext,
          offset: side * (thick / 2 + 0.003),
          color
        })
      }
    }
  }

  // Doorways: plaster lintel, cornice carried over, and walnut architraves.
  for (const s of building.lintels) {
    const thick = 0.3
    segBox(s, 3.4, 5, M.plaster, thick, parts, { cast: true, extend: thick * 0.5 })
    cornice(s, thick, parts, thick * 0.5)
    segBox(s, 3.4, 3.56, M.wood, thick + 0.06, parts, { extend: 0.2 })
    segBox(s, 3.34, 3.4, M.wood, thick + 0.02, parts, { extend: 0 })
    const rot = -Math.atan2(s[3] - s[1], s[2] - s[0])
    for (const [px, pz] of [
      [s[0], s[1]],
      [s[2], s[3]]
    ] as const) {
      parts.push(boxPart(0.2, 3.4, thick + 0.06, M.wood, px, 1.7, pz, rot, false, true))
      parts.push(boxPart(0.24, 0.26, thick + 0.08, M.wood, px, 0.13, pz, rot, false, true))
    }
  }

  for (const s of building.glass) {
    segBox(s, 0, 5, M.glass, 0.04, parts, { receive: false })
    segBox(s, 0, 0.12, M.bronze, 0.1, parts, { cast: true })
    segBox(s, 4.88, 5.0, M.bronze, 0.1, parts, { cast: true })
    for (const p of [
      [s[0], s[1]],
      [s[2], s[3]]
    ] as const) {
      parts.push(boxPart(0.1, 5, 0.1, M.bronze, p[0], 2.5, p[1], 0, true, true))
    }
  }

  const atr = building.rooms.find((r) => r.key === 'Atr')
  if (atr) {
    atr.poly.forEach((p, i) => {
      const q = atr.poly[(i + 1) % atr.poly.length]
      if (!q) return
      const s: Seg = [p[0], p[1], q[0], q[1]]
      segBox(s, 5.3, 7.5, M.glass, 0.04, parts, { receive: false })
      segBox(s, 5, 5.3, M.trim, 0.5, parts, { extend: 0.5 })
      segBox(s, 7.45, 7.6, M.bronze, 0.12, parts, { extend: 0.12 })
      parts.push(boxPart(0.12, 2.3, 0.12, M.bronze, p[0], 6.45, p[1], 0, false, true))
    })
  }

  return parts
}

export function Walls({ building }: { building: Building }) {
  const meshes = useMemo(() => mergeParts(buildWallParts(building)), [building])
  const atlas = useLightmap((s) => s.atlas)

  useEffect(() => {
    if (!atlas) return
    const M = museumMaterials()
    for (const m of meshes) {
      if (m.material === M.plaster || m.material === M.wood) {
        applyLightmap(m.material, m.geometry, atlas)
      }
    }
  }, [atlas, meshes])

  useEffect(() => {
    return () => {
      for (const m of meshes) m.geometry.dispose()
    }
  }, [meshes])

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
