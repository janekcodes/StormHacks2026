import type { Exhibit } from '@museum/content/schema'
import { ZONE_CODES } from '@museum/content/zones'

/** Tab / render order: zone order from BLUEPRINT §4, then ID within the zone. */
export function sortExhibitsForMap(exhibits: readonly Exhibit[]): Exhibit[] {
  const zoneRank = new Map(ZONE_CODES.map((code, index) => [code, index]))
  return [...exhibits].sort((a, b) => {
    const za = zoneRank.get(a.zone) ?? Number.MAX_SAFE_INTEGER
    const zb = zoneRank.get(b.zone) ?? Number.MAX_SAFE_INTEGER
    if (za !== zb) return za - zb
    return a.id.localeCompare(b.id, undefined, { numeric: true })
  })
}
