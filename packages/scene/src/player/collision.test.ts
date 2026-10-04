import { building } from '@museum/content'
import { describe, expect, it } from 'vitest'
import {
  blocked,
  buildCollisionSegments,
  buildExhibitSegments,
  buildObstacles,
  slideMove,
  type ExhibitCollision
} from './collision'

describe('collision', () => {
  const segs = buildCollisionSegments(building)
  const circles = buildObstacles(building)

  it('allows standing in the foyer start pose', () => {
    expect(blocked(0, 20.7, segs, circles)).toBe(false)
  })

  it('blocks the kiosk at the atrium centre', () => {
    expect(blocked(0, 0, segs, circles)).toBe(true)
  })

  it('slides along a wall with axis separation', () => {
    // West exterior wall is at x = -29.4; clearance blocks closer than 0.48 m.
    expect(blocked(-29.0, 0, segs, circles)).toBe(true)
    const next = slideMove(-28.9, 0, -0.5, 0.5, segs, circles)
    expect(next.x).toBe(-28.9)
    expect(next.z).toBe(0.5)
  })
})

describe('exhibit collision', () => {
  const exhibit: ExhibitCollision = {
    tier: 'built',
    footprint: { w: 2, d: 2, h: 1, floor: false },
    position: { x: 0, z: 0, face: [0, 1] }
  }
  const segs = buildExhibitSegments([exhibit])

  it('blocks points within clearance of an exhibit edge', () => {
    // Front edge faces +Z at z = 1; 0.7 is 0.3 m from it.
    expect(blocked(0, 0.7, segs, [])).toBe(true)
  })

  it('allows standing away from the exhibit', () => {
    expect(blocked(0, 3, segs, [])).toBe(false)
  })

  it('refuses to step into the exhibit footprint', () => {
    // Start just outside clearance (z = 1.6) and step 0.5 m toward the centre.
    const next = slideMove(0, 1.6, 0, -0.5, segs, [])
    expect(next.z).toBe(1.6)
  })
})
