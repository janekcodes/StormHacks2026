'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePlayer } from '../player/usePlayer'
import { settingsFor, type QualityTier } from '../quality'
import { useLightmap } from './lightmap'

function CustomRoomEnv({ enabled }: { enabled: boolean }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    if (!enabled) {
      scene.environment = null
      return
    }
    // Match prototype: simple boxed room PMREM
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = new THREE.Scene()
    env.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(24, 9, 24),
        new THREE.MeshBasicMaterial({ color: 0x918a7c, side: THREE.BackSide })
      )
    )
    const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.8) })
    for (const p of [
      [-5, 0],
      [5, 0],
      [0, -6],
      [0, 6]
    ] as const) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 1.2), panelMat)
      m.position.set(p[0], 4.4, p[1])
      env.add(m)
    }
    const fb = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x6d6459 })
    )
    fb.position.y = -4.4
    env.add(fb)
    const tex = pmrem.fromScene(env, 0.04).texture
    scene.environment = tex
    pmrem.dispose()
    return () => {
      scene.environment = null
      tex.dispose()
    }
  }, [enabled, gl, scene])
  return null
}

export function Lighting({ quality }: { quality: QualityTier }) {
  const settings = settingsFor(quality)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)
  const { gl } = useThree()
  const lightmapReady = useLightmap((s) => s.status === 'ready')

  useEffect(() => {
    useLightmap.getState().load()
  }, [])

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 0.8
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.shadowMap.enabled = settings.shadows
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl, settings.shadows])

  useEffect(() => {
    const sun = sunRef.current
    if (!sun || !settings.shadows) return
    sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize)
    const sc = sun.shadow.camera
    sc.left = -16
    sc.right = 16
    sc.top = 16
    sc.bottom = -16
    sc.near = 1
    sc.far = 40
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.03
    sun.shadow.camera.updateProjectionMatrix()
  }, [settings.shadowMapSize, settings.shadows])

  useFrame(() => {
    const { x, z } = usePlayer.getState()
    const sun = sunRef.current
    const target = targetRef.current
    if (!sun || !target) return
    sun.position.set(x + 6, 16, z + 8)
    target.position.set(x, 0, z)
    sun.target = target
    target.updateMatrixWorld()
  })

  return (
    <>
      <color attach="background" args={[0xded9cf]} />
      <fog attach="fog" args={[0xd8d3c8, 16, 48]} />
      <CustomRoomEnv enabled={settings.environment && !lightmapReady} />
      <hemisphereLight args={[0xfff6ea, 0x8a8272, lightmapReady ? 0.05 : 0.3]} />
      <directionalLight
        ref={sunRef}
        color={0xfff0dc}
        intensity={0.72}
        castShadow={settings.shadows}
      />
      <object3D ref={targetRef} />
    </>
  )
}
