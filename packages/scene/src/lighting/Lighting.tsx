'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { streamTextures } from '../building/textures'
import { usePlayer } from '../player/usePlayer'
import { settingsFor, type QualityTier } from '../quality'
import { useLightmap } from './lightmap'

/** Offset of the shadowing key light from the player: high and slightly south-east, like overhead gallery lighting. */
const KEY_OFFSET = new THREE.Vector3(3, 18, 5)

/**
 * A warm interior light probe built from Lightformers (no HDRI download):
 * a grid of ceiling panels, cream wall bounce and a dark wood floor. It drives
 * reflections on glass, brass and polished stone on every tier.
 */
function RoomProbe() {
  const panels: [number, number][] = []
  for (let x = -12; x <= 12; x += 6) for (let z = -12; z <= 12; z += 6) panels.push([x, z])
  return (
    <Environment resolution={128} frames={1} background={false} environmentIntensity={0.85}>
      <color attach="background" args={[0x3b322a]} />
      {panels.map(([x, z]) => (
        <Lightformer
          key={`${x}:${z}`}
          form="rect"
          intensity={2.2}
          color="#fff1dc"
          position={[x, 6, z]}
          rotation-x={Math.PI / 2}
          scale={[2.2, 2.2, 1]}
        />
      ))}
      <Lightformer form="rect" intensity={0.7} color="#efe2cc" position={[0, 2.5, -16]} scale={[40, 5, 1]} />
      <Lightformer form="rect" intensity={0.7} color="#efe2cc" position={[0, 2.5, 16]} rotation-y={Math.PI} scale={[40, 5, 1]} />
      <Lightformer form="rect" intensity={0.55} color="#e8d8c0" position={[-16, 2.5, 0]} rotation-y={Math.PI / 2} scale={[40, 5, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#dfeaf2" position={[16, 3, 0]} rotation-y={-Math.PI / 2} scale={[40, 4, 1]} />
      <Lightformer form="rect" intensity={0.25} color="#6b4a32" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
    </Environment>
  )
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
    const id = window.setTimeout(() => streamTextures(settings.textureSize), 250)
    return () => window.clearTimeout(id)
  }, [settings.textureSize])

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.0
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.shadowMap.enabled = settings.shadows
    gl.shadowMap.type = THREE.PCFShadowMap
  }, [gl, settings.shadows])

  useEffect(() => {
    const sun = sunRef.current
    if (!sun || !settings.shadows) return
    sun.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize)
    const sc = sun.shadow.camera
    sc.left = -14
    sc.right = 14
    sc.top = 14
    sc.bottom = -14
    sc.near = 1
    sc.far = 40
    sun.shadow.bias = -0.0003
    sun.shadow.normalBias = 0.025
    sun.shadow.radius = 3
    sun.shadow.camera.updateProjectionMatrix()
  }, [settings.shadowMapSize, settings.shadows])

  useFrame(() => {
    const { x, z } = usePlayer.getState()
    const sun = sunRef.current
    const target = targetRef.current
    if (!sun || !target) return
    // Snap to a 0.5 m grid so shadow edges do not shimmer while walking.
    const sx = Math.round(x * 2) / 2
    const sz = Math.round(z * 2) / 2
    sun.position.set(sx + KEY_OFFSET.x, KEY_OFFSET.y, sz + KEY_OFFSET.z)
    target.position.set(sx, 0, sz)
    sun.target = target
    target.updateMatrixWorld()
  })

  return (
    <>
      <color attach="background" args={[0xe9e4d6]} />
      <fog attach="fog" args={[0xe9e4d6, 34, 150]} />
      {settings.environment ? <RoomProbe /> : null}
      <hemisphereLight args={[0xfff3e2, 0x5a4636, lightmapReady ? 0.05 : 0.32]} />
      <directionalLight ref={sunRef} color={0xffeedb} intensity={1.15} castShadow={settings.shadows} />
      <object3D ref={targetRef} />
    </>
  )
}
