import type { Building } from '@museum/content/plan-schema'

export type Room = Building['rooms'][number]

export function inPoly(x: number, z: number, poly: readonly (readonly [number, number])[]): boolean {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    if (!pi || !pj) continue
    const xi = pi[0]
    const zi = pi[1]
    const xj = pj[0]
    const zj = pj[1]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c
  }
  return c
}

export function roomAt(building: Building, x: number, z: number): Room | null {
  const rooms = building.rooms
  const atr = rooms.find((r) => r.key === 'Atr')
  if (atr && inPoly(x, z, atr.poly)) return atr
  const conc = rooms.find((r) => r.key === 'Conc')
  if (conc && inPoly(x, z, conc.poly)) return conc
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i]
    if (!r || r.key === 'Atr' || r.key === 'Conc') continue
    if (inPoly(x, z, r.poly)) return r
  }
  return null
}

export function roomCentroid(room: Room): [number, number] {
  let x = 0
  let z = 0
  for (const p of room.poly) {
    x += p[0]
    z += p[1]
  }
  const n = room.poly.length || 1
  return [x / n, z / n]
}
