import { Document } from '@gltf-transform/core'
import { describe, expect, it } from 'vitest'
import { assertWithinBudget, countTriangles } from './optimize'

function makeDocument(triangleCount: number): Document {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const positions = doc
    .createAccessor('position')
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer)
  const indices = doc
    .createAccessor('indices')
    .setType('SCALAR')
    .setArray(new Uint32Array(triangleCount * 3))
    .setBuffer(buffer)
  const prim = doc.createPrimitive().setAttribute('POSITION', positions).setIndices(indices)
  doc.createMesh().addPrimitive(prim)
  return doc
}

describe('countTriangles', () => {
  it('sums indexed triangle counts across primitives', () => {
    expect(countTriangles(makeDocument(10))).toBe(10)
    expect(countTriangles(makeDocument(30_000))).toBe(30_000)
  })
})

describe('assertWithinBudget', () => {
  it('accepts a model inside every budget', () => {
    expect(() => assertWithinBudget('A1', 10_000, 500_000, 2048)).not.toThrow()
  })

  it('rejects an over-budget triangle count with a clear message', () => {
    expect(() => assertWithinBudget('B2', 30_001, 100, 2048)).toThrow(
      /B2: 30001 triangles exceeds the 30000 triangle budget/
    )
  })

  it('rejects an oversized texture with a clear message', () => {
    expect(() => assertWithinBudget('C1', 100, 100, 4096)).toThrow(
      /C1: a 4096px texture exceeds the 2048px limit/
    )
  })

  it('rejects an over-budget file size with a clear message', () => {
    expect(() => assertWithinBudget('D6', 100, 1_500_001, 2048)).toThrow(
      /D6: 1500001 bytes exceeds the 1500000 byte budget/
    )
  })
})
