import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ExhibitId } from '@museum/content/schema'
import { bestFocus, faceYaw, lineClear } from './focus'
import { footprintFor, modelSlot } from './footprint'
import { passportCount } from '../passport'

interface RawExhibit {
  id: string
  tier: 'built' | 'core' | 'extended' | 'open'
  position: { x: number; z: number; face: [number, number] }
  footprint?: { w: number; d: number; h: number; floor: boolean }
}

const exhibits = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../../packages/content/data/exhibits.json', import.meta.url)),
    'utf8'
  )
).exhibits as RawExhibit[]

describe('exhibit placements', () => {
  it('places all 77 exhibits at their content positions', () => {
    expect(exhibits).toHaveLength(77)
    const a1 = exhibits.find((exhibit) => exhibit.id === 'A1')
    expect(a1).toBeDefined()
    expect(a1?.position.x).toBeCloseTo(-10.9672)
    expect(a1?.position.z).toBeCloseTo(15.0543)
    expect(faceYaw(a1?.position.face ?? [0, 1])).toBeCloseTo(Math.atan2(0.5888, -0.8083))
    const ids = new Set(exhibits.map((exhibit) => exhibit.id))
    expect(ids.size).toBe(77)
  })

  it('sizes built model slots from the footprint field', () => {
    const floor = exhibits.find((exhibit) => exhibit.id === 'B2')
    const plinth = exhibits.find((exhibit) => exhibit.id === 'A1')
    expect(floor?.footprint?.floor).toBe(true)
    expect(plinth?.footprint?.floor).toBe(false)
    if (!floor?.footprint || !plinth?.footprint) throw new Error('missing footprint')
    const floorSlot = modelSlot(footprintFor(floor))
    const plinthSlot = modelSlot(footprintFor(plinth))
    expect(floorSlot.w).toBeLessThanOrEqual(floor.footprint.w)
    expect(floorSlot.y).toBeGreaterThan(floor.footprint.h)
    expect(plinthSlot.y).toBeGreaterThan(plinth.footprint.h)
  })
})

describe('focus cone', () => {
  const points = [
    { id: 'A1' as ExhibitId, x: 0, z: -2 },
    { id: 'B2' as ExhibitId, x: 0, z: 2 },
    { id: 'C1' as ExhibitId, x: 2, z: -2 }
  ]

  it('picks the exhibit in front within 4.6 m', () => {
    expect(bestFocus(0, 0, 0, points)).toBe('A1')
  })

  it('ignores exhibits behind the visitor and outside the cone', () => {
    expect(bestFocus(0, 0, 0, points.filter((point) => point.id !== 'A1'))).toBeNull()
  })
})

describe('line of sight', () => {
  const wall = [[-1, 0, 1, 0]] as const

  it('blocks a hover ray that crosses a wall', () => {
    expect(lineClear(0, -2, 0, 2, wall)).toBe(false)
  })

  it('allows a hover ray with no wall between', () => {
    expect(lineClear(0, -2, 0, -0.5, wall)).toBe(true)
  })
})

describe('passport', () => {
  it('counts opened exhibits out of 76 and skips the open slot', () => {
    expect(passportCount(['A1', 'B2', 'X2', 'A1'])).toBe(2)
    expect(passportCount([])).toBe(0)
  })
})
