import type { Band, Exhibit } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'

export { tierLabel } from '@museum/content/schema'

// Era band names and years from BLUEPRINT section 2.
const BAND_COPY: Record<Band, { name: string; years: string }> = {
  prologue: { name: 'Before the machine', years: 'before 1936' },
  inner: { name: 'Foundations', years: '1936 to 1969' },
  middle: { name: 'Expansion', years: '1970 to 1999' },
  outer: { name: 'Ubiquity', years: '2000 to today' }
}

/** "Foundations, 1936 to 1969", or null for exhibits outside the era bands. */
export function bandLabel(band: Band | null): string | null {
  if (band === null) return null
  const copy = BAND_COPY[band]
  return `${copy.name}, ${copy.years}`
}

export function bandName(band: Band | null): string | null {
  return band === null ? null : BAND_COPY[band].name
}

export function zoneLabel(zoneCode: string): string {
  return zoneByCode(zoneCode)?.name ?? zoneCode
}

export function isPlannedExhibit(exhibit: Exhibit): boolean {
  return exhibit.tier !== 'built'
}

export function plannedExhibitNote(exhibit: Exhibit): string {
  if (exhibit.tier === 'open') {
    return 'This slot is open for a future exhibit. It is not on display.'
  }
  return 'This exhibit is planned and not yet on display.'
}

export function exhibitDescription(exhibit: Exhibit): string {
  if (exhibit.caption && exhibit.caption.trim() !== '') {
    return exhibit.caption
  }
  return plannedExhibitNote(exhibit)
}
