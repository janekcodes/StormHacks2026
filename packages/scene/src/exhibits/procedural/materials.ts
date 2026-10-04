import * as THREE from 'three'

/**
 * Shared materials for the 12 interim procedural exhibit models, ported from
 * the prototype `M` material set so the stand-ins look identical to the
 * prototype screenshots.
 */
export interface ProceduralMaterials {
  brushed: THREE.MeshStandardMaterial
  blackMatte: THREE.MeshStandardMaterial
  blackGloss: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  ivory: THREE.MeshStandardMaterial
  ebony: THREE.MeshStandardMaterial
}

let cache: ProceduralMaterials | null = null

export function proceduralMaterials(): ProceduralMaterials {
  if (cache) return cache
  cache = {
    brushed: new THREE.MeshStandardMaterial({ color: 0x9a9893, metalness: 0.85, roughness: 0.42 }),
    blackMatte: new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.55, metalness: 0.15 }),
    blackGloss: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.18, metalness: 0.1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8ccd1, metalness: 1, roughness: 0.25 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: 0.62 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xece4d2, roughness: 0.32 }),
    ebony: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.22, metalness: 0.05 })
  }
  return cache
}
