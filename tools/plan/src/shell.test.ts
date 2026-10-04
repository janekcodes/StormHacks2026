import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BuildingSchema, PlanInputSchema } from '@museum/content'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { generate } from './generate'
import { buildShellScene, exportShellGlb } from './shell'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const plan = PlanInputSchema.parse(
  JSON.parse(readFileSync(join(root, 'packages/content/data/plan.json'), 'utf8'))
)
const building = BuildingSchema.parse(generate(plan))

describe('building shell export', () => {
  it('builds the opaque shell with a lightmap UV channel', () => {
    const scene = buildShellScene(building)

    const meshes = scene.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh)
    // walls + bases + floor + ceiling
    expect(meshes).toHaveLength(4)

    for (const mesh of meshes) {
      const geom = mesh.geometry
      expect(geom.getAttribute('position')).toBeTruthy()
      expect(geom.getAttribute('uv')).toBeTruthy()
      expect(geom.getAttribute('uv2'), `${mesh.material.name} missing uv2`).toBeTruthy()
      expect((geom.getAttribute('uv2') as THREE.BufferAttribute).count).toBe(
        (geom.getAttribute('position') as THREE.BufferAttribute).count
      )
    }
  })

  it('exports a valid binary GLB', async () => {
    const target = join(tmpdir(), 'museum-shell.glb')
    const bytes = await exportShellGlb(building, target)
    expect(bytes).toBeGreaterThan(1000)

    const header = readFileSync(target)
    expect(header.subarray(0, 4).toString('ascii')).toBe('glTF')
  }, 30_000)
})
