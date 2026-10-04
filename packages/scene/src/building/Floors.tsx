'use client'

import type { Building } from '@museum/content/plan-schema'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { applyLightmap, useLightmap } from '../lighting/lightmap'
import { roomAt } from '../rooms'
import { canvasTexture, makeMaterials, outlineShape } from './materials'

function floorTexture(): THREE.CanvasTexture {
  return canvasTexture(
    1024,
    1024,
    (g, w, h) => {
      // Warm honed-stone tiles: large square tiles with a subtle grout grid
      // and gentle per-tile tonal variation for a natural museum floor.
      g.fillStyle = '#e4ddcf'
      g.fillRect(0, 0, w, h)
      const cols = 4
      const rows = 4
      const tw = w / cols
      const th = h / rows
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = 216 + Math.floor(Math.random() * 20)
          g.fillStyle = `rgba(${v},${v - 6},${v - 16},0.5)`
          g.fillRect(c * tw + 3, r * th + 3, tw - 6, th - 6)
        }
      }
      g.strokeStyle = 'rgba(90,82,70,0.35)'
      g.lineWidth = 4
      for (let i = 0; i <= cols; i++) {
        g.beginPath()
        g.moveTo(i * tw, 0)
        g.lineTo(i * tw, h)
        g.stroke()
      }
      for (let i = 0; i <= rows; i++) {
        g.beginPath()
        g.moveTo(0, i * th)
        g.lineTo(w, i * th)
        g.stroke()
      }
    },
    { repeat: [0.35, 0.35] }
  )
}

export function Floors({ building }: { building: Building }) {
  const mats = useMemo(() => makeMaterials(), [])
  const assets = useMemo(() => {
    const floorTex = floorTexture()
    const ceilTex = canvasTexture(
      512,
      512,
      (g, w, h) => {
        g.fillStyle = '#000000'
        g.fillRect(0, 0, w, h)
        g.fillStyle = '#ffffff'
        g.fillRect(40, 236, 432, 40)
      },
      { repeat: [1 / 6, 1 / 6], linear: true }
    )
    const skyTex = canvasTexture(
      512,
      512,
      (g, w, h) => {
        g.fillStyle = '#eef6fb'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#7d8a94'
        g.lineWidth = 10
        for (let i = 0; i <= 4; i++) {
          g.beginPath()
          g.moveTo((i * w) / 4, 0)
          g.lineTo((i * w) / 4, h)
          g.stroke()
          g.beginPath()
          g.moveTo(0, (i * h) / 4)
          g.lineTo(w, (i * h) / 4)
          g.stroke()
        }
      },
      { repeat: [1 / 4, 1 / 4] }
    )

    const baseFloorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0xbdb5a6,
      roughness: 0.5
    })
    const roomFloors = building.rooms.map((r) => {
      const mat = new THREE.MeshStandardMaterial({
        map: floorTex,
        color: 0xdad3c5,
        roughness: r.key === 'Atr' ? 0.22 : 0.42
      })
      const geo = new THREE.ShapeGeometry(outlineShape(r.poly, true))
      return { key: r.key, mat, geo, y: r.key === 'Atr' ? 0.02 : 0.01 }
    })
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x1f1d1a,
      roughness: 0.92,
      emissive: 0xfff0d8,
      emissiveMap: ceilTex,
      emissiveIntensity: 1.1
    })
    const skyMat = new THREE.MeshStandardMaterial({
      map: skyTex,
      emissive: 0xffffff,
      emissiveMap: skyTex,
      emissiveIntensity: 1.1,
      roughness: 0.4
    })

    const baseGeo = new THREE.ShapeGeometry(outlineShape(building.outline, true))

    const atr = building.rooms.find((r) => r.key === 'Atr')
    const ceilShape = outlineShape(building.outline, false)
    if (atr) {
      const hole = new THREE.Path()
      atr.poly.forEach((p, i) => {
        if (i === 0) hole.moveTo(p[0], p[1])
        else hole.lineTo(p[0], p[1])
      })
      hole.closePath()
      ceilShape.holes.push(hole)
    }
    const ceilGeo = new THREE.ShapeGeometry(ceilShape)
    const skyGeo = atr
      ? new THREE.ShapeGeometry(outlineShape(atr.poly, false))
      : new THREE.BufferGeometry()

    const dashMatrices: THREE.Matrix4[] = []
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
        dashMatrices.push(dm.matrix.clone())
      }
    }
    const dashGeo = new THREE.PlaneGeometry(0.55, 0.06)
    dashGeo.rotateX(-Math.PI / 2)
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0x8a857b,
      transparent: true,
      opacity: 0.7
    })

    const marks = building.marks.map((mk) => {
      const room = roomAt(building, mk.p[0], mk.p[1])
      const ink = room?.ink ?? '#4f5963'
      const tex = canvasTexture(512, 128, (g, w) => {
        g.fillStyle = ink
        g.globalAlpha = 0.75
        g.font = '700 84px "Chakra Petch", sans-serif'
        g.textAlign = 'center'
        g.fillText(mk.t, w / 2, 96)
      })
      return {
        tex,
        x: mk.p[0],
        z: mk.p[1],
        rotY: Math.atan2(-mk.u[0], -mk.u[1])
      }
    })

    return {
      floorTex,
      ceilTex,
      skyTex,
      baseFloorMat,
      roomFloors,
      ceilMat,
      skyMat,
      baseGeo,
      ceilGeo,
      skyGeo,
      dashGeo,
      dashMat,
      dashMatrices,
      marks,
      ground: mats.ground
    }
  }, [building, mats])

  const atlas = useLightmap((s) => s.atlas)

  useEffect(() => {
    if (!atlas) return
    applyLightmap(assets.baseFloorMat, assets.baseGeo, atlas)
    applyLightmap(assets.ceilMat, assets.ceilGeo, atlas)
    for (const r of assets.roomFloors) {
      applyLightmap(r.mat, r.geo, atlas)
    }
  }, [atlas, assets])

  useEffect(() => {
    return () => {
      assets.floorTex.dispose()
      assets.ceilTex.dispose()
      assets.skyTex.dispose()
      assets.baseFloorMat.dispose()
      for (const r of assets.roomFloors) {
        r.mat.dispose()
        r.geo.dispose()
      }
      assets.ceilMat.dispose()
      assets.skyMat.dispose()
      assets.baseGeo.dispose()
      assets.ceilGeo.dispose()
      assets.skyGeo.dispose()
      assets.dashGeo.dispose()
      assets.dashMat.dispose()
      for (const m of assets.marks) m.tex.dispose()
      mats.ground.dispose()
    }
  }, [assets, mats])

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        material={assets.ground}
        receiveShadow={false}
        castShadow={false}
      >
        <planeGeometry args={[600, 600]} />
      </mesh>

      <mesh
        geometry={assets.baseGeo}
        material={assets.baseFloorMat}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />

      {assets.roomFloors.map((r) => (
        <mesh
          key={r.key}
          geometry={r.geo}
          material={r.mat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, r.y, 0]}
          receiveShadow
        />
      ))}

      <mesh
        geometry={assets.ceilGeo}
        material={assets.ceilMat}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 5, 0]}
        receiveShadow
      />

      <mesh
        geometry={assets.skyGeo}
        material={assets.skyMat}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 7.5, 0]}
      />

      <instancedMesh
        args={[assets.dashGeo, assets.dashMat, assets.dashMatrices.length]}
        ref={(mesh) => {
          if (!mesh) return
          assets.dashMatrices.forEach((m, i) => mesh.setMatrixAt(i, m))
          mesh.instanceMatrix.needsUpdate = true
        }}
      />

      {assets.marks.map((mk, i) => (
        <group key={i} position={[mk.x, 0.028, mk.z]} rotation={[0, mk.rotY, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.2, 0.55]} />
            <meshBasicMaterial map={mk.tex} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}
