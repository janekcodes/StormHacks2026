'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { applyLightmap, useLightmap } from '../lighting/lightmap'
import { inPoly, roomAt } from '../rooms'
import { cellOffsets, withAtlasCells } from './atlas'
import { canvasTexture, fontFamily, fontsReady, museumMaterials, outlineShape } from './materials'
import { boxPart, cylPart, geoPart, mergeParts, placeMatrix, type MergedMesh, type MergePart } from './merge'
import { scaleUv, TEXTURE_METRES } from './textures'

const PUBLIC_ROOMS = new Set(['Atr', 'Conc', 'Foyer', 'Shop'])
const COFFER = 3
const CEIL_Y = 5

type Poly = readonly (readonly [number, number])[]

/** Flat floor geometry in world XZ with UVs in texture tiles. */
function floorGeo(poly: Poly, metres: number, y: number): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(outlineShape(poly, true))
  scaleUv(geo, metres)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y, 0)
  return geo
}

function MergedMeshes({ meshes }: { meshes: readonly MergedMesh[] }) {
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes])
  return (
    <>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} castShadow={m.castShadow} receiveShadow={m.receiveShadow} />
      ))}
    </>
  )
}

/** Stone halls, polished marble atrium, herringbone parquet galleries; merged per material. */
function useFloors(building: Building) {
  return useMemo(() => {
    const M = museumMaterials()
    const base = floorGeo(building.outline, TEXTURE_METRES.stone, 0)
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
    for (const r of building.rooms) {
      const mat = r.key === 'Atr' ? M.marble : PUBLIC_ROOMS.has(r.key) ? M.stone : M.parquet
      const metres = mat === M.parquet ? TEXTURE_METRES.parquet : TEXTURE_METRES.stone
      const list = byMat.get(mat) ?? []
      list.push(floorGeo(r.poly, metres, r.key === 'Atr' ? 0.02 : 0.01))
      byMat.set(mat, list)
    }
    const rooms: MergedMesh[] = []
    for (const [mat, geos] of byMat) {
      const merged = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      if (merged) rooms.push({ geometry: merged, material: mat, castShadow: false, receiveShadow: true })
    }
    return { base, rooms }
  }, [building])
}

/** Coffered plaster ceiling with recessed downlights, cut around the atrium. */
function useCeiling(building: Building) {
  return useMemo(() => {
    const M = museumMaterials()
    const atr = building.rooms.find((r) => r.key === 'Atr')
    const shape = outlineShape(building.outline, false)
    if (atr) {
      const hole = new THREE.Path()
      atr.poly.forEach((p, i) => (i === 0 ? hole.moveTo(p[0], p[1]) : hole.lineTo(p[0], p[1])))
      hole.closePath()
      shape.holes.push(hole)
    }
    const plane = new THREE.ShapeGeometry(shape)
    scaleUv(plane, TEXTURE_METRES.plaster)
    plane.rotateX(Math.PI / 2)
    plane.translate(0, CEIL_Y, 0)

    const inside = (x: number, z: number) =>
      inPoly(x, z, building.outline) && !(atr && inPoly(x, z, atr.poly)) && Math.hypot(x, z) > building.ra + 0.5
    const parts: MergePart[] = []
    const xs: number[] = []
    const zs: number[] = []
    for (let x = -30; x <= 30; x += COFFER) xs.push(x)
    for (let z = -21; z <= 24; z += COFFER) zs.push(z)
    for (const x of xs) {
      for (let j = 0; j < zs.length - 1; j++) {
        const z0 = zs[j] ?? 0
        const mid = z0 + COFFER / 2
        if (!inside(x, mid)) continue
        parts.push(boxPart(0.24, 0.26, COFFER + 0.24, M.trim, x, CEIL_Y - 0.13, mid, 0, false, true))
      }
    }
    for (const z of zs) {
      for (let i = 0; i < xs.length - 1; i++) {
        const x0 = xs[i] ?? 0
        const mid = x0 + COFFER / 2
        if (!inside(mid, z)) continue
        parts.push(boxPart(COFFER + 0.24, 0.26, 0.24, M.trim, mid, CEIL_Y - 0.13, z, 0, false, true))
      }
    }
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < zs.length - 1; j++) {
        const cx = (xs[i] ?? 0) + COFFER / 2
        const cz = (zs[j] ?? 0) + COFFER / 2
        if (!inside(cx, cz)) continue
        parts.push(cylPart(0.13, 0.13, 0.02, M.downlight, cx, CEIL_Y - 0.012, cz, 20, false, false))
        parts.push(cylPart(0.17, 0.17, 0.016, M.brass, cx, CEIL_Y - 0.006, cz, 20, false, false))
      }
    }
    return { plane, coffers: mergeParts(parts) }
  }, [building])
}

/** Atrium skylight: glazing grid, sky panel and faint light shafts. */
function useSkylight(building: Building) {
  return useMemo(() => {
    const M = museumMaterials()
    const atr = building.rooms.find((r) => r.key === 'Atr')
    const skyTex = canvasTexture(512, 512, (g, w, h) => {
      const grad = g.createRadialGradient(w * 0.45, h * 0.4, 20, w / 2, h / 2, w * 0.75)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.55, '#e3eef6')
      grad.addColorStop(1, '#b9d2e6')
      g.fillStyle = grad
      g.fillRect(0, 0, w, h)
      g.globalAlpha = 0.25
      for (let i = 0; i < 18; i++) {
        g.fillStyle = '#ffffff'
        g.beginPath()
        g.ellipse(((i * 97) % w) + 20, ((i * 61) % h) + 10, 70 + (i % 4) * 20, 24 + (i % 3) * 8, 0, 0, Math.PI * 2)
        g.fill()
      }
    })
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, fog: false, color: new THREE.Color(1.15, 1.15, 1.15) })
    const skyGeo = atr ? new THREE.ShapeGeometry(outlineShape(atr.poly, false)) : new THREE.BufferGeometry()
    skyGeo.computeBoundingBox()
    const bb = skyGeo.boundingBox
    if (bb) {
      const uv = skyGeo.getAttribute('uv')
      const sx = bb.max.x - bb.min.x || 1
      const sy = bb.max.y - bb.min.y || 1
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - bb.min.x) / sx, (uv.getY(i) - bb.min.y) / sy)
    }
    skyGeo.rotateX(Math.PI / 2)
    skyGeo.translate(0, 7.62, 0)

    const parts: MergePart[] = []
    if (atr) {
      const r = building.ra
      for (let t = -r; t <= r; t += 1.4) {
        for (let u = -r; u < r; u += 0.7) {
          const mid = u + 0.35
          if (inPoly(t, mid, atr.poly)) parts.push(boxPart(0.06, 0.1, 0.72, M.bronze, t, 7.58, mid, 0, false, false))
          if (inPoly(mid, t, atr.poly)) parts.push(boxPart(0.72, 0.1, 0.06, M.bronze, mid, 7.58, t, 0, false, false))
        }
      }
    }

    const shaftTex = canvasTexture(
      128,
      256,
      (g, w, h) => {
        const v = g.createLinearGradient(0, 0, 0, h)
        v.addColorStop(0, 'rgba(255,248,232,0.9)')
        v.addColorStop(0.7, 'rgba(255,248,232,0.25)')
        v.addColorStop(1, 'rgba(255,248,232,0)')
        g.fillStyle = v
        g.fillRect(0, 0, w, h)
        g.globalCompositeOperation = 'destination-in'
        const hgrad = g.createLinearGradient(0, 0, w, 0)
        hgrad.addColorStop(0, 'rgba(0,0,0,0)')
        hgrad.addColorStop(0.5, 'rgba(0,0,0,1)')
        hgrad.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = hgrad
        g.fillRect(0, 0, w, h)
      },
      { linear: false }
    )
    const shaftMat = new THREE.MeshBasicMaterial({
      map: shaftTex,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    })
    const shafts: THREE.BufferGeometry[] = []
    for (let i = 0; i < 4; i++) {
      const p = new THREE.PlaneGeometry(6.5, 7.4)
      p.rotateZ(0.14)
      p.rotateY((i * Math.PI) / 4)
      p.translate(0.4, 3.75, -0.3)
      shafts.push(p)
    }
    const shaftGeo = mergeGeometries(shafts, false) ?? new THREE.BufferGeometry()
    shafts.forEach((s) => s.dispose())
    return { skyTex, skyMat, skyGeo, bars: mergeParts(parts), shaftTex, shaftMat, shaftGeo }
  }, [building])
}

/** Brass compass rose inlaid in the atrium floor, around the central kiosk. */
function useInlay(building: Building) {
  return useMemo(() => {
    const M = museumMaterials()
    const parts: MergePart[] = []
    const flat = (geo: THREE.BufferGeometry, x = 0, z = 0, rot = 0) =>
      parts.push(geoPart(geo, placeMatrix(x, 0.026, z, rot, -Math.PI / 2), M.brass, false, true))
    const r0 = Math.min(3.25, building.ra - 2.2)
    const r1 = building.ra - 0.95
    flat(new THREE.RingGeometry(r0, r0 + 0.06, 96))
    flat(new THREE.RingGeometry(r1 - 0.05, r1, 96))
    for (let i = 0; i < 16; i++) {
      const long = i % 2 === 0
      const len = long ? r1 - r0 - 0.1 : (r1 - r0) * 0.45
      const a = (i / 16) * Math.PI * 2
      const mid = r0 + 0.06 + len / 2
      const ray = new THREE.PlaneGeometry(long ? 0.05 : 0.03, len)
      flat(ray, Math.sin(a) * mid, Math.cos(a) * mid, a)
    }
    return mergeParts(parts)
  }, [building])
}

/** Brass wayfinding dashes in the floor. */
function useDashes(building: Building) {
  return useMemo(() => {
    const matrices: THREE.Matrix4[] = []
    const dm = new THREE.Object3D()
    for (const s of building.dashes) {
      const L = Math.hypot(s[2] - s[0], s[3] - s[1])
      const n = Math.floor(L / 1.0)
      const ang = -Math.atan2(s[3] - s[1], s[2] - s[0])
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        dm.position.set(s[0] + (s[2] - s[0]) * t, 0.026, s[1] + (s[3] - s[1]) * t)
        dm.rotation.set(0, ang, 0)
        dm.updateMatrix()
        matrices.push(dm.matrix.clone())
      }
    }
    const geo = new THREE.PlaneGeometry(0.5, 0.045)
    geo.rotateX(-Math.PI / 2)
    return { geo, matrices }
  }, [building])
}

const MARK_W = 512
const MARK_H = 128
const MARK_COLS = 4

/** Era years inlaid in the floor in the zone ink, all in one atlas and one draw call. */
function EraMarks({ building }: { building: Building }) {
  const [fontTick, setFontTick] = useState(0)
  useEffect(() => {
    let alive = true
    void fontsReady().then(() => alive && setFontTick((n) => n + 1))
    return () => {
      alive = false
    }
  }, [])

  const rows = Math.ceil(building.marks.length / MARK_COLS)
  const data = useMemo(() => {
    void fontTick
    const c = document.createElement('canvas')
    c.width = MARK_W * MARK_COLS
    c.height = MARK_H * rows
    const g = c.getContext('2d')
    if (!g) throw new Error('2d context unavailable')
    g.textAlign = 'center'
    g.font = `700 84px ${fontFamily('display')}`
    building.marks.forEach((mk, i) => {
      const room = roomAt(building, mk.p[0], mk.p[1])
      g.fillStyle = room?.ink ?? '#4f5963'
      g.globalAlpha = 0.85
      g.fillText(mk.t, (i % MARK_COLS) * MARK_W + MARK_W / 2, Math.floor(i / MARK_COLS) * MARK_H + 98)
    })
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const mat = withAtlasCells(
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.4 }),
      MARK_COLS,
      rows,
      'era-marks'
    )
    const geo = new THREE.PlaneGeometry(2.2, 0.55)
    geo.rotateX(-Math.PI / 2)
    geo.setAttribute('cellOffset', cellOffsets(building.marks.length, MARK_COLS, rows))
    const matrices = building.marks.map((mk) => {
      const m = new THREE.Matrix4().makeRotationY(Math.atan2(-mk.u[0], -mk.u[1]))
      m.setPosition(mk.p[0], 0.028, mk.p[1])
      return m
    })
    return { tex, mat, geo, matrices }
  }, [building, rows, fontTick])

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
      renderOrder={1}
      ref={(mesh) => {
        if (!mesh) return
        data.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
        mesh.instanceMatrix.needsUpdate = true
        mesh.computeBoundingSphere()
      }}
    />
  )
}

/** Gradient sky dome, lawn, paved plaza and a ring of distant trees. */
function Exterior() {
  const data = useMemo(() => {
    const M = museumMaterials()
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x7fa7cf) },
        horizon: { value: new THREE.Color(0xe9e4d6) },
        ground: { value: new THREE.Color(0xb9b29f) }
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top;
uniform vec3 horizon;
uniform vec3 ground;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizon, ground, clamp(-h * 6.0, 0.0, 1.0));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
    })
    const skyGeo = new THREE.SphereGeometry(380, 32, 16)

    const plaza = new THREE.PlaneGeometry(96, 84)
    scaleUv(plaza, 1 / 32)
    plaza.rotateX(-Math.PI / 2)
    plaza.translate(0, -0.01, 3)

    const trunks: MergePart[] = []
    const crowns: MergePart[] = []
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + (i % 3) * 0.05
      const r = 62 + ((i * 37) % 23)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const s = 0.8 + ((i * 13) % 7) / 10
      trunks.push(cylPart(0.25 * s, 0.35 * s, 3 * s, M.trunk, x, 1.5 * s, z, 6, false, false))
      const crown = new THREE.IcosahedronGeometry(3.2 * s, 1)
      crowns.push(geoPart(crown, placeMatrix(x, 4.8 * s, z), M.leaf, false, false))
    }
    return { skyMat, skyGeo, plaza, trees: mergeParts([...trunks, ...crowns]) }
  }, [])

  useEffect(
    () => () => {
      data.skyMat.dispose()
      data.skyGeo.dispose()
      data.plaza.dispose()
    },
    [data]
  )

  const M = museumMaterials()
  return (
    <>
      <mesh geometry={data.skyGeo} material={data.skyMat} renderOrder={-1} frustumCulled={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} material={M.ground}>
        <planeGeometry args={[700, 700]} />
      </mesh>
      <mesh geometry={data.plaza} material={M.paving} receiveShadow />
      <MergedMeshes meshes={data.trees} />
    </>
  )
}

export function Floors({ building }: { building: Building }) {
  const M = museumMaterials()
  const floors = useFloors(building)
  const ceiling = useCeiling(building)
  const sky = useSkylight(building)
  const inlay = useInlay(building)
  const dashes = useDashes(building)
  const atlas = useLightmap((s) => s.atlas)

  useEffect(() => {
    if (!atlas) return
    applyLightmap(M.stone, floors.base, atlas)
    applyLightmap(M.ceiling, ceiling.plane, atlas)
  }, [atlas, floors, ceiling, M])

  useEffect(
    () => () => {
      floors.base.dispose()
      ceiling.plane.dispose()
      sky.skyTex.dispose()
      sky.skyMat.dispose()
      sky.skyGeo.dispose()
      sky.shaftTex.dispose()
      sky.shaftMat.dispose()
      sky.shaftGeo.dispose()
      dashes.geo.dispose()
    },
    [floors, ceiling, sky, dashes]
  )

  return (
    <>
      <Exterior />
      <mesh geometry={floors.base} material={M.stone} receiveShadow />
      <MergedMeshes meshes={floors.rooms} />
      <MergedMeshes meshes={inlay} />
      <mesh geometry={ceiling.plane} material={M.ceiling} receiveShadow />
      <MergedMeshes meshes={ceiling.coffers} />
      <mesh geometry={sky.skyGeo} material={sky.skyMat} />
      <MergedMeshes meshes={sky.bars} />
      <mesh geometry={sky.shaftGeo} material={sky.shaftMat} renderOrder={2} />
      <instancedMesh
        args={[dashes.geo, M.brass, dashes.matrices.length]}
        ref={(mesh) => {
          if (!mesh) return
          dashes.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
          mesh.instanceMatrix.needsUpdate = true
          mesh.computeBoundingSphere()
        }}
      />
      <EraMarks building={building} />
    </>
  )
}
