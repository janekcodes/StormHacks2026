import type { Tour, TourLine } from '@museum/content'

export interface TourNarrationTarget {
  id: string
  line: TourLine
}

/** Every spoken tour line, keyed by an id that survives reordering stops. */
export function tourNarrationTargets(tour: Tour): TourNarrationTarget[] {
  const prefix = `tour-${tour.id}`
  return [
    { id: `${prefix}-intro`, line: tour.intro },
    ...tour.stops.flatMap((stop) => [
      { id: `${prefix}-${stop.exhibitId}`, line: stop.bridge },
      { id: `${prefix}-${stop.exhibitId}-stop`, line: stop.line }
    ]),
    { id: `${prefix}-outro`, line: tour.outro },
    { id: `${prefix}-fallback`, line: tour.fallback }
  ]
}
