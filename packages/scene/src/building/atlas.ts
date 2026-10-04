import * as THREE from 'three'

/**
 * Patches a standard material so its `map` is sampled from one cell of a
 * texture atlas per instance. The instanced geometry must carry a
 * `cellOffset` vec2 attribute (bottom-left corner of the cell in UV space).
 */
export function withAtlasCells(
  material: THREE.MeshStandardMaterial,
  cols: number,
  rows: number,
  cacheKey: string
): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCell = { value: new THREE.Vector2(1 / cols, 1 / rows) }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 cellOffset;\nuniform vec2 uCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * uCell + cellOffset;')
  }
  material.customProgramCacheKey = () => cacheKey
  return material
}

/** `cellOffset` attribute for `count` cells laid out row-major from the top-left. */
export function cellOffsets(count: number, cols: number, rows: number): THREE.InstancedBufferAttribute {
  const offsets = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    offsets[i * 2] = (i % cols) / cols
    offsets[i * 2 + 1] = 1 - (Math.floor(i / cols) + 1) / rows
  }
  return new THREE.InstancedBufferAttribute(offsets, 2)
}
