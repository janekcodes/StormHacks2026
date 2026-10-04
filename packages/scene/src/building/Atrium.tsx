'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture, makeMaterials, wrapText } from './materials'
import { boxPart, cylPart, mergeParts, type MergePart, type MergedMesh } from './merge'

export function Atrium({ building }: { building: Building }) {
  const mats = useMemo(() => makeMaterials(), [])

  const { meshes, kioskTex, kioskMat } = useMemo(() => {
    const M = mats
    const parts: MergePart[] = []

    const ar = building.ra - 1.6
    for (const a of [45, 135, 225, 315]) {
      const rad = (a * Math.PI) / 180
      const x = Math.cos(rad) * ar
      const z = Math.sin(rad) * ar
      parts.push(cylPart(0.95, 0.8, 0.7, M.pot, x, 0.35, z, 24))
      parts.push(cylPart(0.12, 0.16, 2.6, M.trunk, x, 1.9, z, 12))
      // foliage as icosahedra via mergeable approximation: small boxes clusters skipped;
      // use icosahedron parts manually below
    }

    parts.push(cylPart(0.7, 0.7, 2.4, M.plinth, 0, 1.2, 0, 32))

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26
      const x = Math.cos(a) * 2.6
      const z = Math.sin(a) * 2.6
      parts.push(boxPart(1.6, 0.42, 0.5, M.bench, x, 0.21, z, -a + Math.PI / 2))
    }

    // Foyer desk
    parts.push(boxPart(3.2, 1.05, 0.8, M.plinth, -3.6, 0.525, 31.0, 0.3))
    parts.push(boxPart(3.3, 0.05, 0.9, M.frame, -3.6, 1.07, 31.0, 0.3))

    // Shop table
    const shop = building.rooms.find((r) => r.key === 'Shop')
    if (shop) {
      let cx = 0
      let cz = 0
      for (const p of shop.poly) {
        cx += p[0]
        cz += p[1]
      }
      const n = shop.poly.length || 1
      cx = cx / n + 0.2
      cz = cz / n + 1.2
      parts.push(boxPart(0.8, 0.8, 1.6, M.wood, cx, 0.4, cz, 0))
    }

    const merged = mergeParts(parts)

    const kioskTex = canvasTexture(1024, 512, (g, w, h) => {
      g.fillStyle = '#0c0e10'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#ffb347'
      g.font = '700 70px "Chakra Petch", sans-serif'
      g.fillText('ATRIUM', 60, 120)
      g.fillStyle = '#e6e9ec'
      g.font = '700 54px "Chakra Petch", sans-serif'
      g.fillText('Prologue · before 1936', 60, 200)
      g.fillStyle = '#9aa3ac'
      g.font = '36px "IBM Plex Mono", monospace'
      wrapText(
        g,
        'Every wing opens off the concourse. Walk toward the windows to move forward in time.',
        60,
        290,
        w - 120,
        50
      )
    })
    const kioskMat = new THREE.MeshStandardMaterial({
      map: kioskTex,
      emissive: 0xffffff,
      emissiveMap: kioskTex,
      emissiveIntensity: 0.6,
      roughness: 0.3
    })

    return { meshes: merged, kioskTex, kioskMat }
  }, [building, mats])

  const foliage = useMemo(() => {
    const ar = building.ra - 1.6
    return [45, 135, 225, 315].map((a) => {
      const rad = (a * Math.PI) / 180
      return { x: Math.cos(rad) * ar, z: Math.sin(rad) * ar }
    })
  }, [building.ra])

  useEffect(() => {
    return () => {
      for (const m of meshes) m.geometry.dispose()
      kioskTex.dispose()
      kioskMat.dispose()
      for (const mat of Object.values(mats)) mat.dispose()
    }
  }, [meshes, kioskTex, kioskMat, mats])

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

      {foliage.map((p, i) => (
        <group key={i}>
          <mesh position={[p.x, 3.6, p.z]} castShadow material={mats.leaf}>
            <icosahedronGeometry args={[1.3, 1]} />
          </mesh>
          <mesh position={[p.x + 0.5, 3.1, p.z - 0.3]} castShadow material={mats.leaf}>
            <icosahedronGeometry args={[0.9, 1]} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI, 0]} material={kioskMat}>
        <cylinderGeometry args={[0.705, 0.705, 1.1, 48, 1, true, -Math.PI / 2.4, Math.PI / 1.2]} />
      </mesh>
    </>
  )
}
