export interface Zone {
  code: string
  name: string
  location: string
  ink: string
  tint: string
  built: number
  core: number
  extended: number
  open: number
}

// Zone metadata and expected tier counts, mirroring BLUEPRINT section 4.
// `ink` is the wayfinding accent (floor marks, signage, plaques, map markers, HUD).
// `tint` fills the 2D floor plan washes only; the 3D scene uses realistic
// stone/wood materials (see docs/decisions/0010-museum-materials.md).
export const ZONES: readonly Zone[] = [
  { code: 'P', name: 'Prologue', location: 'Atrium (centre)', ink: '#7a6a48', tint: '#efe9dc', built: 0, core: 2, extended: 5, open: 0 },
  { code: 'A', name: 'Logic, Theory & Cryptography', location: 'South-west wing', ink: '#5a49c4', tint: '#ebe8fb', built: 1, core: 3, extended: 5, open: 0 },
  { code: 'B', name: 'Hardware & Architecture', location: 'West wing', ink: '#a8601a', tint: '#fbeedd', built: 3, core: 4, extended: 5, open: 0 },
  { code: 'C', name: 'Software, Languages & Systems', location: 'North-west wing', ink: '#23744a', tint: '#e3f3ea', built: 3, core: 4, extended: 3, open: 0 },
  { code: 'D', name: 'Networks & the Web', location: 'North-east wing', ink: '#1f6699', tint: '#e1eef8', built: 2, core: 3, extended: 6, open: 0 },
  { code: 'E', name: 'Interaction & Personal Computing', location: 'North wing (smallest room)', ink: '#a8375f', tint: '#f9e4ed', built: 1, core: 3, extended: 4, open: 0 },
  { code: 'F', name: 'Artificial Intelligence', location: 'East wing', ink: '#0e7272', tint: '#ddf2f2', built: 3, core: 3, extended: 5, open: 0 },
  { code: 'G', name: 'People Gallery', location: 'Front gallery, west of the foyer', ink: '#4f5963', tint: '#eceef0', built: 0, core: 1, extended: 2, open: 0 },
  { code: 'S', name: 'Society & Ethics', location: 'Front-right room, larger half', ink: '#4f5963', tint: '#eceef0', built: 0, core: 1, extended: 3, open: 0 },
  { code: 'X', name: 'Future Lab', location: 'Front-right room, smaller half', ink: '#4f5963', tint: '#eceef0', built: 0, core: 0, extended: 1, open: 1 }
]

export const ZONE_CODES: readonly string[] = ZONES.map((zone) => zone.code)

export function zoneByCode(code: string): Zone | undefined {
  return ZONES.find((zone) => zone.code === code)
}
