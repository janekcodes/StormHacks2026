import * as THREE from 'three'

export interface ExhibitMaterials {
  plinth: THREE.MeshStandardMaterial
  plinthGrey: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  frame: THREE.MeshStandardMaterial
  platform: THREE.MeshStandardMaterial
  model: THREE.MeshStandardMaterial
  brushed: THREE.MeshStandardMaterial
  ring: THREE.MeshBasicMaterial
  iconCore: THREE.MeshStandardMaterial
  iconExt: THREE.MeshStandardMaterial
  unit: THREE.BoxGeometry
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
    plinth: new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.5 }),
    plinthGrey: new THREE.MeshStandardMaterial({ color: 0xded8cb, roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd6e8ee,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      envMapIntensity: 1.6,
      depthWrite: false
    }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.4, metalness: 0.7 }),
    platform: new THREE.MeshStandardMaterial({ color: 0xe2dccf, roughness: 0.55 }),
    model: new THREE.MeshStandardMaterial({ color: 0xc5c0b6, roughness: 0.72 }),
    brushed: new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 0.35, metalness: 0.75 }),
    ring: new THREE.MeshBasicMaterial({ color: 0x8b939c, side: THREE.DoubleSide }),
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
