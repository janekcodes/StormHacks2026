'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { BenchSpot } from './furniture'
import { canvasTexture, fontFamily, fontsReady, museumMaterials, wrapText } from './materials'
import { boxPart, cylPart, mergeParts, type MergedMesh, type MergePart } from './merge'

/** Deterministic pseudo-random sequence so furniture never shifts between loads. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Offsets a local point by a rotation about a pivot. */
function at(cx: number, cz: number, rot: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [cx + lx * c + lz * s, cz - lx * s + lz * c]
}

/** Leather-topped walnut bench on brass legs; long axis along local x. */
export function benchParts(x: number, z: number, rot: number, len: number, parts: MergePart[]): void {
  const M = museumMaterials()
  const depth = 0.48
  parts.push(boxPart(len, 0.09, depth, M.leather, x, 0.47, z, rot))
  parts.push(boxPart(len - 0.04, 0.08, depth - 0.04, M.wood, x, 0.385, z, rot))
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [lx, lz] = at(x, z, rot, sx * (len / 2 - 0.1), sz * (depth / 2 - 0.08))
      parts.push(cylPart(0.022, 0.018, 0.35, M.brass, lx, 0.175, lz, 10, true, true))
    }
  }
  const [s0x, s0z] = at(x, z, rot, 0, 0)
  parts.push(boxPart(len - 0.24, 0.03, 0.03, M.brass, s0x, 0.12, s0z, rot, false, true))
}

function leafTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    const rand = rng(7)
    for (let i = 0; i < 26; i++) {
      const x = 30 + rand() * (w - 60)
      const y = 30 + rand() * (h - 60)
      const a = rand() * Math.PI * 2
      const l = 28 + rand() * 22
      const shade = 70 + Math.floor(rand() * 60)
      g.save()
      g.translate(x, y)
      g.rotate(a)
      g.fillStyle = `rgb(${shade - 30}, ${shade + 50}, ${shade - 40})`
      g.beginPath()
      g.ellipse(0, 0, l, l * 0.38, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = 'rgba(30, 50, 20, 0.5)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(-l, 0)
      g.lineTo(l, 0)
      g.stroke()
      g.restore()
    }
  })
}

/** Leaf-card crowns for the atrium trees, one instanced draw call. */
function Foliage({ trees }: { trees: readonly { x: number; z: number }[] }) {
  const data = useMemo(() => {
    const tex = leafTexture()
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.75,
      color: 0xd8e8c8
    })
    const geo = new THREE.PlaneGeometry(0.9, 0.9)
    const rand = rng(31)
    const obj = new THREE.Object3D()
    const matrices: THREE.Matrix4[] = []
    for (const t of trees) {
      for (let i = 0; i < 150; i++) {
        const u = rand() * Math.PI * 2
        const v = Math.acos(2 * rand() - 1)
        const r = 0.5 + rand() * 0.95
        obj.position.set(
          t.x + Math.sin(v) * Math.cos(u) * r * 1.15,
          3.75 + Math.cos(v) * r * 0.85,
          t.z + Math.sin(v) * Math.sin(u) * r * 1.15
        )
        obj.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
        obj.scale.setScalar(0.7 + rand() * 0.6)
        obj.updateMatrix()
        matrices.push(obj.matrix.clone())
      }
    }
    return { tex, mat, geo, matrices }
  }, [trees])

  useEffect(
    () => () => {
      data.tex.dispose()
      data.mat.dispose()
      data.geo.dispose()
    },
    [data]
  )

  return (
    <instancedMesh
      args={[data.geo, data.mat, data.matrices.length]}
      castShadow
      ref={(mesh) => {
        if (!mesh) return
        data.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
        mesh.instanceMatrix.needsUpdate = true
        mesh.computeBoundingSphere()
      }}
    />
  )
}

/** Engraved information column text wrapped round the atrium drum. */
function useKiosk() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    void fontsReady().then(() => alive && setTick((n) => n + 1))
    return () => {
      alive = false
    }
  }, [])
  const data = useMemo(() => {
    void tick
    const tex = canvasTexture(1024, 512, (g, w) => {
      g.fillStyle = '#2b1a12'
      g.fillRect(0, 0, w, 512)
      g.strokeStyle = '#c19a5b'
      g.lineWidth = 4
      g.strokeRect(24, 24, w - 48, 464)
      g.fillStyle = '#d9b97a'
      g.font = `700 64px ${fontFamily('display')}`
      g.fillText('ATRIUM', 70, 130)
      g.fillStyle = '#f2ead8'
      g.font = `600 48px ${fontFamily('display')}`
      g.fillText('Prologue · before 1936', 70, 200)
      g.fillStyle = '#cdbfa6'
      g.font = `500 32px ${fontFamily('body')}`
      wrapText(g, 'Every wing opens off the concourse. Walk toward the windows to move forward in time.', 70, 290, w - 140, 48)
    })
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.18
    })
    return { tex, mat }
  }, [tick])
  useEffect(
    () => () => {
      data.tex.dispose()
      data.mat.dispose()
    },
    [data]
  )
  return data
}

/** Merch on the shop table: books and boxed sets in a few spine colours. */
function merchParts(cx: number, cz: number, top: number, parts: MergePart[]): void {
  const M = museumMaterials()
  const colours = [0x6b2b2b, 0x23455c, 0x2f5a3c, 0xc9a35a, 0xe8e0cc, 0x3b3b46]
  const rand = rng(11)
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      const h = 0.04 + rand() * 0.05
      const p = boxPart(0.17, h, 0.24, M.merch, cx - 0.27 + i * 0.18, top + h / 2, cz - 0.55 + row * 0.55, (rand() - 0.5) * 0.2)
      p.color = new THREE.Color(colours[Math.floor(rand() * colours.length)] ?? 0xffffff)
      parts.push(p)
    }
  }
}

export function Atrium({ building, benches }: { building: Building; benches: readonly BenchSpot[] }) {
  const kiosk = useKiosk()

  const trees = useMemo(() => {
    const ar = building.ra - 0.96
    return [45, 135, 225, 315].map((a) => {
      const rad = (a * Math.PI) / 180
      return { x: Math.cos(rad) * ar, z: Math.sin(rad) * ar }
    })
  }, [building.ra])

  const meshes = useMemo((): MergedMesh[] => {
    const M = museumMaterials()
    const parts: MergePart[] = []

    // Stone urns with brass rims.
    for (const t of trees) {
      parts.push(cylPart(0.62, 0.7, 0.12, M.pot, t.x, 0.06, t.z, 32))
      parts.push(cylPart(0.9, 0.62, 0.62, M.pot, t.x, 0.43, t.z, 32))
      parts.push(cylPart(0.96, 0.96, 0.06, M.brass, t.x, 0.77, t.z, 32))
      parts.push(cylPart(0.86, 0.86, 0.02, M.soil, t.x, 0.75, t.z, 24, false, true))
      parts.push(cylPart(0.09, 0.14, 2.8, M.trunk, t.x, 2.15, t.z, 10))
    }

    // Central information column.
    parts.push(cylPart(0.7, 0.7, 2.4, M.marble, 0, 1.2, 0, 48))
    parts.push(cylPart(0.78, 0.8, 0.14, M.marble, 0, 0.07, 0, 48))
    parts.push(cylPart(0.73, 0.73, 0.03, M.brass, 0, 0.98, 0, 48, false, true))
    parts.push(cylPart(0.73, 0.73, 0.03, M.brass, 0, 2.12, 0, 48, false, true))
    parts.push(cylPart(0.76, 0.72, 0.1, M.trim, 0, 2.45, 0, 48))

    // Six leather benches around the column.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26
      benchParts(Math.cos(a) * 2.6, Math.sin(a) * 2.6, -a + Math.PI / 2, 1.6, parts)
    }

    // Panelled reception desk in the foyer.
    {
      const cx = -2.16
      const cz = 18.6
      const rot = 0.3
      parts.push(boxPart(3.2, 0.96, 0.8, M.wood, cx, 0.56, cz, rot))
      parts.push(boxPart(3.06, 0.1, 0.7, M.bronze, cx, 0.05, cz, rot))
      for (const side of [-1, 1]) {
        const [px, pz] = at(cx, cz, rot, 0, side * 0.405)
        parts.push(boxPart(2.9, 0.62, 0.02, M.panel, px, 0.56, pz, rot, false, true))
      }
      parts.push(boxPart(3.34, 0.06, 0.92, M.marble, cx, 1.07, cz, rot))
      parts.push(boxPart(3.36, 0.02, 0.94, M.brass, cx, 1.03, cz, rot, false, true))
    }

    // Shop display table with merchandise.
    const shop = building.rooms.find((r) => r.key === 'Shop')
    if (shop) {
      let cx = 0
      let cz = 0
      for (const p of shop.poly) {
        cx += p[0]
        cz += p[1]
      }
      const n = shop.poly.length || 1
      cx = cx / n + 0.12
      cz = cz / n + 0.72
      parts.push(boxPart(0.9, 0.05, 1.7, M.wood, cx, 0.8, cz, 0))
      parts.push(boxPart(0.76, 0.03, 1.5, M.wood, cx, 0.22, cz, 0))
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          parts.push(boxPart(0.06, 0.78, 0.06, M.wood, cx + sx * 0.38, 0.39, cz + sz * 0.78, 0))
        }
      }
      merchParts(cx, cz, 0.825, parts)
    }

    for (const b of benches) benchParts(b.x, b.z, b.rotY, 1.8, parts)

    return mergeParts(parts)
  }, [building, trees, benches])

  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes])

  return (
    <>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} castShadow={m.castShadow} receiveShadow={m.receiveShadow} />
      ))}
      <Foliage trees={trees} />
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI, 0]} material={kiosk.mat}>
        <cylinderGeometry args={[0.705, 0.705, 1.1, 48, 1, true, -Math.PI / 2.4, Math.PI / 1.2]} />
      </mesh>
    </>
  )
}
