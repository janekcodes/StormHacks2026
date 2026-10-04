import type { Band, Exhibit, Tier } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'

export function tierLabel(tier: Tier): string {
  switch (tier) {
    case 'built':
      return 'Built'
    case 'core':
      return 'Core'
    case 'extended':
      return 'Extended'
    case 'open':
      return 'Open'
  }
}

export function bandLabel(band: Band | null): string {
  if (band === null) return 'none'
  return band
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
