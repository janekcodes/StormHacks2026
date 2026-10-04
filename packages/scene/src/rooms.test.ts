import { building } from '@museum/content'
import { describe, expect, it } from 'vitest'
import { roomAt, roomCentroid, type Room } from './rooms'

function probePoint(room: Room): [number, number] {
  if (room.key === 'Atr') return [0, 0]
  if (room.key === 'Conc') {
    // Concourse is a ring; its vertex centroid sits in the atrium cut-out.
    const mid = (building.ra + building.rc) / 2
    return [mid, 0]
  }
  return roomCentroid(room)
}

describe('roomAt point-in-polygon', () => {
  it('returns the correct room for one interior point per room', () => {
    expect(building.rooms).toHaveLength(13)

    for (const room of building.rooms) {
      const [x, z] = probePoint(room)
      const found = roomAt(building, x, z)
      expect(found?.key, `probe of ${room.key} at (${x}, ${z})`).toBe(room.key)
    }
  })

  it('prioritises atrium over the concourse polygon', () => {
    expect(roomAt(building, 0, 0)?.key).toBe('Atr')
  })

  it('starts the player in the foyer', () => {
    expect(roomAt(building, 0, 20.7)?.key).toBe('Foyer')
  })
})
