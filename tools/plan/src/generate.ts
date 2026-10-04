import type { Building, PlanInput } from '@museum/content'
import { ZONES } from '@museum/content'
import {
  type Pt,
  type Ring,
  FAR,
  octagon,
  buildOutline,
  dedupe,
  rayIntersectRing,
  splitWall,
  sectorRoom,
  clipBox,
  difference,
  intersect,
  halfPlane,
  lineRingSpan,
  round3,
  roundPt,
  dirOf,
  pointAtRadius,
  at
} from './geometry'

const HALF = 22.5

// Offsets recovered from the prototype as plan pixels (see 03-reference-geometry-rules.md).
// They are authored in pixels and converted to metres at the plan scale so a
// scale change compresses them along with the rest of the geometry.
const MARK_INNER_OFFSET_PX = 30
const MARK_BAND_OFFSET_PX = 16
const SIGN_INSET_PX = 6 // inside the concourse edge
const DASH_CLEARANCE_PX = 8 // perpendicular from the clipping wall

const SPECIAL_ROOMS: Record<string, { name: string; tint: string; ink: string }> = {
  Shop: { name: 'Museum Shop', tint: '#f4f2ed', ink: '#4f5963' },
  Foyer: { name: 'Foyer', tint: '#f4f2ed', ink: '#a8601a' },
  Conc: { name: 'Concourse', tint: '#efece4', ink: '#4f5963' }
}

function zoneByCode(code: string) {
  const zone = ZONES.find((z) => z.code === code)
  if (!zone) throw new Error(`unknown zone ${code}`)
  return zone
}

function wingMeta(code: string) {
  const zone = zoneByCode(code)
  return { key: code, name: `Wing ${code} · ${zone.name}`, tint: zone.tint, ink: zone.ink }
}

function zoneRoomMeta(code: string, key: string) {
  const zone = zoneByCode(code)
  return { key, name: zone.name, tint: zone.tint, ink: zone.ink }
}

function specialMeta(key: string) {
  if (key === 'Atr') {
    // The atrium takes zone P's colours (BLUEPRINT section 4), not the reference palette.
    const zone = zoneByCode('P')
    return { key, name: 'Atrium · Prologue, before 1936', tint: zone.tint, ink: zone.ink }
  }
  const meta = SPECIAL_ROOMS[key]
  if (!meta) throw new Error(`unknown special room ${key}`)
  return { key, ...meta }
}

// Exterior walls: one per outline edge, walking from the last vertex, with the
// entrance opening left out. Two bulge-repeat edges are zero-length and kept.
function buildExtWalls(plan: PlanInput, outline: Ring): Array<[number, number, number, number, 'ext']> {
  const n = outline.length
  const jambA = plan.outline.length + plan.entranceGap[0]
  const jambB = plan.outline.length + plan.entranceGap[1]
  const walls: Array<[number, number, number, number, 'ext']> = []
  for (let i = 0; i < n; i++) {
    if (i > jambA && i <= jambB) continue
    const a = outline[(i - 1 + n) % n] as Pt
    const b = outline[i] as Pt
    walls.push([a[0], a[1], b[0], b[1], 'ext'])
  }
  return walls
}

function projectOn(pt: Pt, u: Pt): number {
  return pt[0] * u[0] + pt[1] * u[1]
}

// Era lines and year marks for one room.
interface BandLayout {
  band1: number
  band2: number
  dash1: { lo: number; hi: number }
  dash2: { lo: number; hi: number }
  // cross-section [lo, hi] along v at the given distance along u
  cross: (distance: number) => [number, number] | null
}

function layoutBands(
  room: Ring,
  angle: number,
  innerEdge: number,
  dashClearanceM: number
): BandLayout {
  const u = dirOf(angle)
  const v: Pt = [-u[1], u[0]]
  const outer = Math.max(...room.map((p) => projectOn(p, u)))
  const band1 = innerEdge + (outer - innerEdge) / 3
  const band2 = innerEdge + (2 * (outer - innerEdge)) / 3

  const dashAt = (depth: number): { lo: number; hi: number } | null => {
    const p0: Pt = [depth * u[0], depth * u[1]]
    const span = lineRingSpan(p0, v, room)
    if (!span) return null
    const pullLo = dashClearanceM / Math.abs(span.edgeMin[0] * u[0] + span.edgeMin[1] * u[1])
    const pullHi = dashClearanceM / Math.abs(span.edgeMax[0] * u[0] + span.edgeMax[1] * u[1])
    return { lo: span.tmin + pullLo, hi: span.tmax - pullHi }
  }

  const cross = (distance: number): [number, number] | null => {
    const p0: Pt = [distance * u[0], distance * u[1]]
    const span = lineRingSpan(p0, v, room)
    return span ? [span.tmin, span.tmax] : null
  }

  const d1 = dashAt(band1)
  const d2 = dashAt(band2)
  if (!d1 || !d2) throw new Error('era line fell outside the room')
  return { band1, band2, dash1: d1, dash2: d2, cross }
}

// A [Pt, Pt] segment flattened to the [x1, z1, x2, z2] line form the schema expects.
function flatLine(l: [Pt, Pt]): [number, number, number, number] {
  return [round3(l[0][0]), round3(l[0][1]), round3(l[1][0]), round3(l[1][1])]
}

export function generate(plan: PlanInput): Building {
  const scale = plan.scale
  const ra = round3(plan.atriumR * scale)
  const rc = round3(plan.concourseR * scale)
  const innerEdge = rc * Math.cos(22.5 * (Math.PI / 180))

  // Prototype offsets expressed in metres at the plan's scale.
  const markInnerOffsetM = MARK_INNER_OFFSET_PX * scale
  const markBandOffsetM = MARK_BAND_OFFSET_PX * scale
  const signInsetM = SIGN_INSET_PX * scale
  const dashClearanceM = DASH_CLEARANCE_PX * scale

  const outline = buildOutline(plan)
  const buildingRing = dedupe(outline)
  const concourseOct = octagon(rc)
  const atriumOct = octagon(ra)

  // ---- walls ---------------------------------------------------------------
  const walls: Array<[number, number, number, number, 'ext' | 'int']> = []
  const lintels: Array<[Pt, Pt]> = []

  for (const w of buildExtWalls(plan, outline)) walls.push(w)

  // concourse sides: side k=1 (south) is fully open
  const concourseDoor = { width: plan.doors.concourse.widthPx * scale, fractions: plan.doors.concourse.positions }
  for (let k = 0; k < 8; k++) {
    if (k === 1) continue
    const a = concourseOct[k] as Pt
    const b = concourseOct[(k + 1) % 8] as Pt
    const { segments, lintels: lints } = splitWall(a, b, concourseDoor)
    for (const s of segments) walls.push([s[0][0], s[0][1], s[1][0], s[1][1], 'int'])
    lintels.push(...lints)
  }

  // radial walls from each concourse vertex out to the first outline crossing
  const radialDoor = { width: plan.doors.radial.widthPx * scale, fractions: plan.doors.radial.positions }
  const frontDoor = { width: plan.doors.frontWall.widthPx * scale, fractions: plan.doors.frontWall.positions }
  for (let k = 0; k < 8; k++) {
    const angle = 22.5 + 45 * k
    const a = concourseOct[k] as Pt
    const b = rayIntersectRing(angle, buildingRing)
    const door = k === 1 || k === 2 ? frontDoor : radialDoor
    const { segments, lintels: lints } = splitWall(a, b, door)
    for (const s of segments) walls.push([s[0][0], s[0][1], s[1][0], s[1][1], 'int'])
    lintels.push(...lints)
  }

  // SE split wall starts at radius rc (not the octagon edge)
  {
    const seStart = pointAtRadius(plan.seSplit.angle, rc)
    const seEnd = rayIntersectRing(plan.seSplit.angle, buildingRing)
    const seDoor = { width: plan.doors.seSplit.widthPx * scale, fractions: plan.doors.seSplit.positions }
    const { segments, lintels: lints } = splitWall(seStart, seEnd, seDoor)
    for (const s of segments) walls.push([s[0][0], s[0][1], s[1][0], s[1][1], 'int'])
    lintels.push(...lints)
  }

  // alcove walls at x = peopleMaxX / shopMinX
  const alcoveDoor = { width: plan.doors.alcove.widthPx * scale, fractions: plan.doors.alcove.positions }
  const peopleX = (plan.southSplit.peopleMaxX - plan.origin[0]) * scale
  const shopX = (plan.southSplit.shopMinX - plan.origin[0]) * scale
  const alcoveCapZ = (plan.southSplit.alcoveCapY - plan.origin[1]) * scale
  for (const x of [peopleX, shopX]) {
    const a: Pt = [x, innerEdge]
    const b: Pt = [x, alcoveCapZ]
    const { segments, lintels: lints } = splitWall(a, b, alcoveDoor)
    for (const s of segments) walls.push([s[0][0], s[0][1], s[1][0], s[1][1], 'int'])
    lintels.push(...lints)
  }

  // ---- glass ---------------------------------------------------------------
  const glass: Array<[Pt, Pt]> = []
  const glassDoor = { width: plan.atriumGlassGap.widthPx * scale, fractions: [0.5] }
  const SIDE_TO_EDGE: Record<string, number> = { E: 7, S: 1, W: 3, N: 5 }
  const gappedEdges = new Set(plan.atriumGlassGap.sides.map((s) => SIDE_TO_EDGE[s]))
  for (let k = 0; k < 8; k++) {
    const a = atriumOct[k] as Pt
    const b = atriumOct[(k + 1) % 8] as Pt
    if (!gappedEdges.has(k)) {
      glass.push([roundPt(a), roundPt(b)])
    } else {
      const { segments } = splitWall(a, b, glassDoor)
      for (const s of segments) glass.push([roundPt(s[0]), roundPt(s[1])])
    }
  }

  // ---- rooms ---------------------------------------------------------------
  const wingAngles: Record<string, number> = { A: 135, B: 180, C: 225, D: 315, E: 270, F: 0 }

  const rings: Record<string, Ring> = {}
  for (const [key, angle] of Object.entries(wingAngles)) {
    rings[key] = sectorRoom(angle, HALF, buildingRing, innerEdge, FAR)
  }

  // SE sector, then split into Society (Sx) and Future Lab (X)
  const seStart = plan.seSplit.society[0]
  const seEnd = plan.seSplit.futureLab[1]
  const seCentre = (seStart + seEnd) / 2
  const seHalf = (seEnd - seStart) / 2
  const seSector = sectorRoom(seCentre, seHalf, buildingRing, innerEdge, FAR)
  rings.Sx = intersect(seSector, halfPlane(-45, 0, FAR)) as Ring
  rings.X = intersect(seSector, halfPlane(135, 0, FAR)) as Ring

  // S sector: People (west), Shop (east), Foyer (the rest)
  const sSector = sectorRoom(90, HALF, buildingRing, innerEdge, FAR)
  const people = clipBox(sSector, -FAR, peopleX, -FAR, alcoveCapZ) as Ring
  const shop = clipBox(sSector, shopX, FAR, -FAR, alcoveCapZ) as Ring
  const foyer = difference(sSector, people, shop) as Ring
  rings.G = people
  rings.Shop = shop
  rings.Foyer = foyer
  rings.Conc = concourseOct
  rings.Atr = atriumOct

  const rooms = [
    wingMeta('A'),
    wingMeta('B'),
    wingMeta('C'),
    wingMeta('D'),
    wingMeta('E'),
    wingMeta('F'),
    zoneRoomMeta('G', 'G'),
    zoneRoomMeta('S', 'Sx'),
    zoneRoomMeta('X', 'X'),
    specialMeta('Shop'),
    specialMeta('Foyer'),
    specialMeta('Conc'),
    specialMeta('Atr')
  ].map((meta) => ({ ...meta, poly: (rings[meta.key] as Ring).map(roundPt) }))

  // ---- dashes, marks, signs ------------------------------------------------
  // Bands go to A..F plus Sx (Sx uses 33.75 deg, its own span centre).
  const markAngle: Record<string, number> = { A: 135, B: 180, C: 225, D: 315, E: 270, F: 0, Sx: 33.75 }

  const dashes: Array<[Pt, Pt]> = []
  const marks: Array<{ p: Pt; u: Pt; t: string }> = []
  const years = ['1936', '1970', '2000']

  for (const [key, angle] of Object.entries(markAngle)) {
    const room = rings[key] as Ring
    const u = dirOf(angle)
    const v: Pt = [-u[1], u[0]]
    const layout = layoutBands(room, angle, innerEdge, dashClearanceM)

    // era lines at the two band joins
    const p1: Pt = [layout.band1 * u[0], layout.band1 * u[1]]
    dashes.push([roundPt(at(p1, v, layout.dash1.lo)), roundPt(at(p1, v, layout.dash1.hi))])
    const p2: Pt = [layout.band2 * u[0], layout.band2 * u[1]]
    dashes.push([roundPt(at(p2, v, layout.dash2.lo)), roundPt(at(p2, v, layout.dash2.hi))])

    // year marks
    const innerCross = layout.cross(innerEdge + markInnerOffsetM)
    const mid = innerCross ? (innerCross[0] + innerCross[1]) / 2 : 0
    const markDists = [
      { dist: innerEdge + markInnerOffsetM, lat: mid },
      { dist: layout.band1 + markBandOffsetM, lat: (layout.dash1.lo + layout.dash1.hi) / 2 },
      { dist: layout.band2 + markBandOffsetM, lat: (layout.dash2.lo + layout.dash2.hi) / 2 }
    ]
    markDists.forEach((m, i) => {
      const p: Pt = [m.dist * u[0] + m.lat * v[0], m.dist * u[1] + m.lat * v[1]]
      marks.push({ p: roundPt(p), u: roundPt(u), t: years[i] as string })
    })
  }

  // wing signs: one per concourse side that has a wall (skip the open S side)
  const signs: Array<{ p: Pt; u: Pt; k: string }> = []
  for (const s of plan.sectors) {
    if (s.zone === 'S') continue
    const u = dirOf(s.angle)
    const r = innerEdge - signInsetM
    signs.push({ p: roundPt([r * u[0], r * u[1]]), u: roundPt(u), k: s.zone === 'SX' ? 'Sx' : s.zone })
  }

  // ---- zones ---------------------------------------------------------------
  const zones: Record<string, { name: string; ink: string }> = {}
  for (const zone of ZONES) zones[zone.code] = { name: zone.name, ink: zone.ink }

  const jambA = plan.outline.length + plan.entranceGap[0]
  const jambB = plan.outline.length + plan.entranceGap[1]
  const entrance: [Pt, Pt] = [roundPt(outline[jambA] as Pt), roundPt(outline[jambB] as Pt)]

  return {
    outline: outline.map(roundPt),
    walls,
    lintels: lintels.map(flatLine),
    glass: glass.map(flatLine),
    rooms,
    dashes: dashes.map(flatLine),
    marks,
    signs,
    zones,
    entrance,
    ra,
    rc,
    meta: {
      scale_m_per_plan_px: scale,
      plan_origin_px: plan.origin,
      note: 'Generated by @museum/plan from packages/content/data/plan.json (BLUEPRINT section 5).'
    }
  }
}
