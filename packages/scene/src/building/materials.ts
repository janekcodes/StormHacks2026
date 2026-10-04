import * as THREE from 'three'

export function makeMaterials(): {
  wall: THREE.MeshStandardMaterial
  ceil: THREE.MeshStandardMaterial
  base: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  frame: THREE.MeshStandardMaterial
  plinth: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  leaf: THREE.MeshStandardMaterial
  trunk: THREE.MeshStandardMaterial
  pot: THREE.MeshStandardMaterial
  bench: THREE.MeshStandardMaterial
  ground: THREE.MeshStandardMaterial
} {
  return {
    wall: new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.9 }),
    ceil: new THREE.MeshStandardMaterial({
      color: 0x1f1d1a,
      roughness: 0.92,
      emissive: 0xfff0d8,
      emissiveIntensity: 1.1
    }),
    base: new THREE.MeshStandardMaterial({ color: 0x2f2a24, roughness: 0.5 }),
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
    plinth: new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.55 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x5f8f5a, roughness: 0.8 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5d4630, roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.6 }),
    bench: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.5 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x9c988d, roughness: 1 })
  }
}

export function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts?: { repeat?: [number, number]; linear?: boolean }
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) throw new Error('2d context unavailable')
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = opts?.linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
  t.anisotropy = 8
  if (opts?.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(opts.repeat[0], opts.repeat[1])
  }
  return t
}

export function wrapText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number
): number {
  const words = text.split(' ')
  let line = ''
  let cy = y
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, cy)
      cy += lh
      line = w
    } else {
      line = t
    }
  }
  if (line) g.fillText(line, x, cy)
  return cy
}

/** Shape in XY that maps to world XZ after rotateX(-PI/2) when using negated Z. */
export function outlineShape(
  pts: readonly (readonly [number, number])[],
  negateZ: boolean
): THREE.Shape {
  const s = new THREE.Shape()
  pts.forEach((p, i) => {
    const zz = negateZ ? -p[1] : p[1]
    if (i === 0) s.moveTo(p[0], zz)
    else s.lineTo(p[0], zz)
  })
  s.closePath()
  return s
}
