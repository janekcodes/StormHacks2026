'use client'

import type { Exhibit } from '@museum/content/schema'
import { useFrame, useThree } from '@react-three/fiber'
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode
} from 'react'
import * as THREE from 'three'
import { DRACOLoader, GLTFLoader, KTX2Loader, MeshoptDecoder } from 'three-stdlib'
import { usePlayer } from '../player/usePlayer'
import { axisNear, CULL_M, faceYaw } from './focus'
import { footprintFor, modelBaseY } from './footprint'
import { PROCEDURAL_MODELS } from './procedural'

/**
 * KTX2 basis transcoder and Draco decoder are fetched on demand only when a
 * GLB actually uses them. Meshopt ships inside `three-stdlib` with no CDN.
 */
const BASIS_TRANSCODER = 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/basis/'
const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'

let sharedKtx2: KTX2Loader | null = null

/** A GLB loader with Draco + Meshopt + KTX2 configured once per renderer. */
function makeLoader(gl: THREE.WebGLRenderer): GLTFLoader {
  const loader = new GLTFLoader()
  const draco = new DRACOLoader()
  draco.setDecoderPath(DRACO_DECODER)
  loader.setDRACOLoader(draco)
  // three-stdlib exports MeshoptDecoder as a factory; three's GLTFLoader
  // expects the instantiated decoder (with `.supported` / `.ready`).
  loader.setMeshoptDecoder(MeshoptDecoder())
  if (!sharedKtx2) {
    sharedKtx2 = new KTX2Loader()
    sharedKtx2.setTranscoderPath(BASIS_TRANSCODER)
    sharedKtx2.detectSupport(gl)
  }
  loader.setKTX2Loader(sharedKtx2)
  return loader
}

/** Mirror the prototype: opaque meshes cast and receive shadows, transparent ones do not. */
function castShadows(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    const materials = Array.isArray(material) ? material : material ? [material] : []
    if (materials.some((m) => m && m.transparent)) return
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
}

/** Apply shadow flags to a procedural model's meshes once mounted. */
function ShadowModel({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    if (ref.current) castShadows(ref.current)
  }, [])
  return <group ref={ref}>{children}</group>
}

function ProceduralBody({ exhibit }: { exhibit: Exhibit }) {
  const Model = PROCEDURAL_MODELS[exhibit.id] as ComponentType | undefined
  if (!Model) return null
  return <Model />
}

/**
 * One built exhibit object. Tries to load `public/models/<ID>.glb`; while it
 * is absent (or still loading) it renders the interim procedural component at
 * the same footprint position, so dropping a file replaces it with no code
 * change. The load is non-throwing: a missing or malformed GLB never surfaces
 * as a page error.
 */
export function ModelSlot({ exhibit }: { exhibit: Exhibit }) {
  const group = useRef<THREE.Group>(null)
  const gl = useThree((state) => state.gl)
  const fp = footprintFor(exhibit)
  const baseY = modelBaseY(fp)
  const yaw = faceYaw(exhibit.position.face)
  const [glb, setGlb] = useState<THREE.Object3D | null>(null)

  useLayoutEffect(() => {
    // `kind: 'procedural'` renders the interim model with no GLB request, so
    // no 404 is ever issued for exhibits whose asset has not been authored.
    // Flipping `kind` to 'glb' (and running `pnpm assets:build`) is all it
    // takes to start loading `/models/<ID>.glb`.
    if (exhibit.model?.kind !== 'glb') return
    let alive = true
    const loader = makeLoader(gl)
    loader.load(
      `/models/${exhibit.id}.glb`,
      (result) => {
        if (!alive) return
        castShadows(result.scene)
        setGlb(result.scene)
      },
      undefined,
      () => {
        // Missing or malformed GLB: keep the procedural model.
      }
    )
    return () => {
      alive = false
    }
  }, [exhibit.id, exhibit.model?.kind, gl])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const { x, z } = usePlayer.getState()
    g.visible = axisNear(x, z, exhibit.position.x, exhibit.position.z, CULL_M)
  })

  return (
    <group
      ref={group}
      position={[exhibit.position.x, baseY, exhibit.position.z]}
      rotation={[0, yaw, 0]}
    >
      {glb ? (
        <primitive object={glb} />
      ) : (
        <ShadowModel>
          <ProceduralBody exhibit={exhibit} />
        </ShadowModel>
      )}
    </group>
  )
}
