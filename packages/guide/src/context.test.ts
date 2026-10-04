import { describe, expect, it } from 'vitest'
import { buildContext, type ExhibitDetail, type VisitorContext } from './context'

const visitor: VisitorContext = {
  room: 'Wing B',
  roomKey: 'B',
  nearestExhibitId: 'B3',
  openPortalId: null,
  visitedIds: ['B2', 'C1']
}

const detail: ExhibitDetail = {
  id: 'B3',
  year: '1947/54',
  title: 'The transistor',
  zone: 'B',
  band: 'inner',
  tier: 'built',
  caption: 'The point-contact transistor switched in 1947.',
  hook: 'Switch a transistor on and off.',
  stats: [{ k: 'Year', v: '1947', sourceId: 's1' }],
  caveat: 'A "first" claim with a caveat.'
}

describe('buildContext', () => {
  it('describes the visitor state', () => {
    const text = buildContext(visitor, null)
    expect(text).toContain('Wing B')
    expect(text).toContain('Nearest exhibit: B3')
    expect(text).toContain('Visited exhibits: B2, C1')
  })

  it('includes the focused exhibit detail', () => {
    const text = buildContext(visitor, detail)
    expect(text).toContain('Focused exhibit: B3')
    expect(text).toContain('The point-contact transistor switched in 1947.')
    expect(text).toContain('Year: 1947')
    expect(text).toContain('Caveat:')
  })

  it('renders a visitor with no visited exhibits', () => {
    const text = buildContext({ ...visitor, visitedIds: [] }, null)
    expect(text).toContain('Visited exhibits: none')
  })
})
