import { describe, expect, it } from 'vitest'
import type { Exhibit } from '@museum/content/schema'
import { sortExhibitsForMap } from './sortExhibits'

function stub(id: Exhibit['id'], zone: string): Exhibit {
  return {
    id,
    year: '0',
    title: id,
    zone,
    band: null,
    tier: 'extended',
    position: { x: 0, z: 0, face: [0, 1] }
  }
}

describe('sortExhibitsForMap', () => {
  it('orders by zone then id', () => {
    const sorted = sortExhibitsForMap([
      stub('B2', 'B'),
      stub('A1', 'A'),
      stub('P1', 'P'),
      stub('B11', 'B')
    ])
    expect(sorted.map((e) => e.id)).toEqual(['P1', 'A1', 'B2', 'B11'])
  })
})
