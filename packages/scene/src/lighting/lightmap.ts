'use client'

import * as THREE from 'three'
import { create } from 'zustand'

/**
 * Optional baked lightmap for the building shell (decision 0005). The scene
 * tries to load `/lightmap/atlas.png` once; when present it is applied to the
 * static wall, floor and ceiling materials as `lightMap`, and the hemisphere /
 * environment lighting is reduced because that indirect light is already baked.
 *
 * The `uv2` channel below is a placeholder copy of `uv`. Plan 13 replaces it
 * with the packed unwrap emitted by `tools/plan` (or loads the baked shell GLB).
 */

export const LIGHTMAP_URL = '/lightmap/atlas.png'

/** Config flag committed alongside the bake; flips to true in plan 13. */
export const LIGHTMAP_CONFIG_URL = '/lightmap.json'

export type LightmapStatus = 'idle' | 'loading' | 'ready' | 'missing'

interface LightmapState {
  atlas: THREE.Texture | null
  status: LightmapStatus
  load: () => void
}

export const useLightmap = create<LightmapState>((set, get) => ({
  atlas: null,
  status: 'idle',
  load: () => {
    if (get().status !== 'idle') return
    set({ status: 'loading' })
    // Read the always-present flag first so no 404 is issued for an unbaked
    // atlas (a missing `/lightmap/atlas.png` would log a console error).
    fetch(LIGHTMAP_CONFIG_URL)
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((config: { enabled?: boolean }) => {
        if (!config.enabled) {
          set({ atlas: null, status: 'missing' })
          return
        }
        return new THREE.TextureLoader().loadAsync(LIGHTMAP_URL).then((texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          texture.flipY = false
          texture.needsUpdate = true
          set({ atlas: texture, status: 'ready' })
        })
      })
      .catch(() => set({ atlas: null, status: 'missing' }))
  }
}))

/** Copy `uv` into `uv2` (TEXCOORD_1) so a lightMap has a channel to sample. */
export function addUv2(geometry: THREE.BufferGeometry): void {
  if (geometry.getAttribute('uv2')) return
  const uv = geometry.getAttribute('uv')
  if (!uv) return
  const uv2 = new THREE.BufferAttribute(new Float32Array(uv.array.length), uv.itemSize)
  for (let i = 0; i < uv.array.length; i++) uv2.array[i] = uv.array[i]!
  geometry.setAttribute('uv2', uv2)
}

/** Attach the atlas to a standard material and ensure the mesh carries uv2. */
export function applyLightmap(
  material: THREE.Material,
  geometry: THREE.BufferGeometry | null,
  atlas: THREE.Texture
): void {
  const std = material as THREE.MeshStandardMaterial
  if (!std.lightMap) {
    std.lightMap = atlas
    std.lightMapIntensity = 1
    std.needsUpdate = true
  }
  if (geometry) addUv2(geometry)
}
