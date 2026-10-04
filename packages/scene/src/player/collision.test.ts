import { building } from '@museum/content'
import { describe, expect, it } from 'vitest'
import {
  blocked,
  buildCollisionSegments,
  buildObstacles,
  slideMove
} from './collision'

describe('collision', () => {
  const segs = buildCollisionSegments(building)
  const circles = buildObstacles(building)

  it('allows standing in the foyer start pose', () => {
    expect(blocked(0, 34.5, segs, circles)).toBe(false)
  })

  it('blocks the kiosk at the atrium centre', () => {
    expect(blocked(0, 0, segs, circles)).toBe(true)
  })

  it('slides along a wall with axis separation', () => {
    // West exterior wall is at x = -49; clearance blocks closer than 0.48 m.
    expect(blocked(-48.6, 0, segs, circles)).toBe(true)
    const next = slideMove(-48.4, 0, -1, 0.5, segs, circles)
    expect(next.x).toBe(-48.4)
    expect(next.z).toBe(0.5)
  })
})
