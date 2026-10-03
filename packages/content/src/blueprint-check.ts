import type { Exhibit } from './schema'

export interface BlueprintRow {
  id: string
  year: string
  title: string
  zone: string
  band: string | null
  tier: string
}

export type BlueprintField = 'year' | 'title' | 'zone' | 'band' | 'tier'

export interface BlueprintDiff {
  id: string
  field: BlueprintField
  blueprint: string
  exhibits: string
}

const ZONE_NAME_TO_CODE: Record<string, string> = {
  Atrium: 'P',
  'Wing A': 'A',
  'Wing B': 'B',
  'Wing C': 'C',
  'Wing D': 'D',
  'Wing E': 'E',
  'Wing F': 'F',
  'People Gallery': 'G',
  'Society & Ethics': 'S',
  'Future Lab': 'X'
}

const BAND_TO_CODE: Record<string, string | null> = {
  Prologue: 'prologue',
  Inner: 'inner',
  Middle: 'middle',
  Outer: 'outer',
  'n/a': null
}

const TIER_TO_CODE: Record<string, string> = {
  Built: 'built',
  Core: 'core',
  Extended: 'extended',
  'Open slot': 'open'
}

export function parseBlueprintTable(markdown: string): BlueprintRow[] {
  const sectionStart = markdown.indexOf('## 6. Exhibit registry')
  if (sectionStart === -1) {
    throw new Error('BLUEPRINT section 6 not found')
  }
  const sectionEnd = markdown.indexOf('\n## ', sectionStart)
  const section = sectionEnd === -1 ? markdown.slice(sectionStart) : markdown.slice(sectionStart, sectionEnd)
  const rows: BlueprintRow[] = []
  for (const line of section.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.split('|').map((cell) => cell.trim())
    if (!cells[1] || cells[1] === 'ID' || cells[1] === '---') continue

    const id = cells[1] ?? ''
    const year = cells[2] ?? ''
    const title = cells[3] ?? ''
    const zoneName = cells[4] ?? ''
    const bandName = cells[5] ?? ''
    const tierName = cells[6] ?? ''

    const zone = ZONE_NAME_TO_CODE[zoneName]
    const band = BAND_TO_CODE[bandName]
    const tier = TIER_TO_CODE[tierName]
    if (zone === undefined || band === undefined || tier === undefined) {
      throw new Error(`Unrecognised cell in BLUEPRINT table row: ${trimmed}`)
    }
    rows.push({ id, year, title, zone, band, tier })
  }
  return rows
}

export function compareBlueprint(
  blueprint: BlueprintRow[],
  exhibits: readonly Exhibit[]
): BlueprintDiff[] {
  const diffs: BlueprintDiff[] = []
  const byId = new Map<string, Exhibit>(exhibits.map((exhibit) => [exhibit.id, exhibit]))

  for (const row of blueprint) {
    const exhibit = byId.get(row.id)
    if (!exhibit) {
      diffs.push({ id: row.id, field: 'title', blueprint: row.title, exhibits: '<missing>' })
      continue
    }
    if (row.year !== exhibit.year) {
      diffs.push({ id: row.id, field: 'year', blueprint: row.year, exhibits: exhibit.year })
    }
    if (row.title !== exhibit.title) {
      diffs.push({ id: row.id, field: 'title', blueprint: row.title, exhibits: exhibit.title })
    }
    if (row.zone !== exhibit.zone) {
      diffs.push({ id: row.id, field: 'zone', blueprint: row.zone, exhibits: exhibit.zone })
    }
    if (row.band !== exhibit.band) {
      diffs.push({
        id: row.id,
        field: 'band',
        blueprint: row.band ?? 'n/a',
        exhibits: exhibit.band ?? 'n/a'
      })
    }
    if (row.tier !== exhibit.tier) {
      diffs.push({ id: row.id, field: 'tier', blueprint: row.tier, exhibits: exhibit.tier })
    }
  }

  for (const exhibit of exhibits) {
    if (!blueprint.some((row) => row.id === exhibit.id)) {
      diffs.push({ id: exhibit.id, field: 'title', blueprint: '<missing>', exhibits: exhibit.title })
    }
  }

  return diffs
}
