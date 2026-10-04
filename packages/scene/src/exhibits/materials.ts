import * as THREE from 'three'

/** Shared geometry and the few exhibit-only materials. Surfaces come from `museumMaterials()`. */
export interface ExhibitMaterials {
  iconCore: THREE.MeshStandardMaterial
  iconExt: THREE.MeshStandardMaterial
  unit: THREE.BoxGeometry
  /** Unit-height cylinder (radius 0.5) for posts and stanchions. */
  post: THREE.CylinderGeometry
  ringGeo: THREE.RingGeometry
  plaqueGeo: THREE.PlaneGeometry
  hitGeo: THREE.BoxGeometry
  hit: THREE.MeshBasicMaterial
  icons: THREE.BufferGeometry[]
}

let cache: ExhibitMaterials | null = null

export function exhibitMaterials(): ExhibitMaterials {
  if (cache) return cache
  cache = {
    iconCore: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.35,
      emissive: 0xffffff,
      emissiveIntensity: 0.15
    }),
    iconExt: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.35,
      emissive: 0xffffff,
      emissiveIntensity: 0.04
    }),
    unit: new THREE.BoxGeometry(1, 1, 1),
    post: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    ringGeo: new THREE.RingGeometry(0.62, 0.68, 48),
    plaqueGeo: new THREE.PlaneGeometry(0.42, 0.25),
    hitGeo: new THREE.BoxGeometry(1, 2.6, 1),
    hit: new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
    icons: [
      new THREE.IcosahedronGeometry(0.2, 0),
      new THREE.TorusKnotGeometry(0.13, 0.04, 64, 8),
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.TorusGeometry(0.16, 0.05, 12, 28),
      new THREE.DodecahedronGeometry(0.19, 0)
    ]
  }
  return cache
}
