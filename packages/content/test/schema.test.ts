import { describe, expect, it } from 'vitest'
import { ExhibitSchema, StrictExhibitSchema } from '../src/schema'

const STATS = [
  { k: 'a', v: '1', sourceId: 's1' },
  { k: 'b', v: '2', sourceId: 's2' },
  { k: 'c', v: '3', sourceId: 's3' }
]

const SOURCES = [
  { id: 's1', label: 'S1', url: 'u1' },
  { id: 's2', label: 'S2', url: 'u2' },
  { id: 's3', label: 'S3', url: 'u3' }
]

function validBuilt() {
  return {
    id: 'B2',
    year: '1945',
    title: 'ENIAC',
    zone: 'B',
    band: 'inner',
    tier: 'built',
    position: { x: 0, z: 0, face: [1, 0] },
    portal: { package: '@museum/portal-b2' },
    caption: 'A general-purpose electronic digital computer.',
    stats: STATS,
    sources: SOURCES
  }
}

describe('exhibit schema', () => {
  it('accepts a valid built exhibit', () => {
    expect(ExhibitSchema.safeParse(validBuilt()).success).toBe(true)
  })

  it('rejects an unknown exhibit ID', () => {
    expect(ExhibitSchema.safeParse({ ...validBuilt(), id: 'ZZ9' }).success).toBe(false)
  })

  it('rejects a built exhibit with 2 stats', () => {
    expect(ExhibitSchema.safeParse({ ...validBuilt(), stats: STATS.slice(0, 2) }).success).toBe(
      false
    )
  })

  it('rejects a stat pointing at a missing source', () => {
    expect(
      ExhibitSchema.safeParse({
        ...validBuilt(),
        stats: [{ k: 'a', v: '1', sourceId: 'missing' }, STATS[1], STATS[2]]
      }).success
    ).toBe(false)
  })

  it('rejects a "first" claim without a caveat', () => {
    expect(ExhibitSchema.safeParse({ ...validBuilt(), title: 'The first computer' }).success).toBe(
      false
    )
  })

  it('accepts a "first" claim with a caveat', () => {
    expect(
      ExhibitSchema.safeParse({
        ...validBuilt(),
        title: 'The first computer',
        caveat: 'First applies to general-purpose machines only.'
      }).success
    ).toBe(true)
  })

  it('rejects a built exhibit with no sources', () => {
    expect(ExhibitSchema.safeParse({ ...validBuilt(), sources: [] }).success).toBe(false)
  })

  it('allows TBD markers by default but rejects them in strict mode', () => {
    const withTbd = {
      ...validBuilt(),
      caption: '[TBD: caption]',
      stats: STATS.map((stat) => ({ ...stat, sourceId: '[TBD: source]' })),
      sources: [{ id: '[TBD: source]', label: '[TBD: source]', url: '[TBD: source]' }]
    }
    expect(ExhibitSchema.safeParse(withTbd).success).toBe(true)
    expect(StrictExhibitSchema.safeParse(withTbd).success).toBe(false)
  })
})
