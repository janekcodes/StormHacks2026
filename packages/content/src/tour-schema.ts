import { z } from 'zod'
import { AudioSchema, ExhibitIdSchema, type Exhibit } from './schema'

export const TourLineSchema = z.object({
  text: z.string().min(1),
  /** Spoken length in ms, written by tools/narrate from the alignment file. */
  durationMs: z.number().int().positive().optional(),
  audio: AudioSchema.optional()
})
export type TourLine = z.infer<typeof TourLineSchema>

export const TourStopSchema = z.object({
  exhibitId: ExhibitIdSchema,
  bridge: TourLineSchema
})
export type TourStop = z.infer<typeof TourStopSchema>

export const TourSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  intro: TourLineSchema,
  stops: z.array(TourStopSchema).min(1),
  outro: TourLineSchema,
  fallback: TourLineSchema
})
export type Tour = z.infer<typeof TourSchema>

const DASHES = /[–—]/

/** Content rules a schema cannot express (BLUEPRINT section 0 rule 6, section 6). */
export function checkTour(tour: Tour, exhibits: readonly Exhibit[]): string[] {
  const errors: string[] = []
  const built = new Set(exhibits.filter((exhibit) => exhibit.tier === 'built').map((exhibit) => exhibit.id))
  const seen = new Set<string>()

  for (const stop of tour.stops) {
    if (!built.has(stop.exhibitId)) errors.push(`${stop.exhibitId} is not a built exhibit`)
    if (seen.has(stop.exhibitId)) errors.push(`${stop.exhibitId} appears twice`)
    seen.add(stop.exhibitId)
  }

  const lines: Array<[string, string]> = [
    ['intro', tour.intro.text],
    ...tour.stops.map((stop): [string, string] => [`bridge ${stop.exhibitId}`, stop.bridge.text]),
    ['outro', tour.outro.text],
    ['fallback', tour.fallback.text]
  ]
  for (const [where, text] of lines) {
    if (DASHES.test(text)) errors.push(`${where} contains an em or en dash`)
  }
  return errors
}
