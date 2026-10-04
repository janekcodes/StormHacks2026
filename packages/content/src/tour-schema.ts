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

const DASHES = /[\u2013\u2014]/

/** Maximum words per kind of tour line, so the whole tour fits about two minutes. */
export const TOUR_WORD_LIMITS = { intro: 14, outro: 14, bridge: 8 } as const

function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/** Expected spoken length of a line with no generated audio: 150 words per minute. */
export function estimateSpeechMs(text: string): number {
  return Math.max(1500, wordsOf(text).length * 400)
}

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

  // Each entry: where, text, word limit (none for the fallback).
  const lines: Array<[string, string, number | null]> = [
    ['intro', tour.intro.text, TOUR_WORD_LIMITS.intro],
    ...tour.stops.flatMap((stop): Array<[string, string, number | null]> => [
      [`bridge ${stop.exhibitId}`, stop.bridge.text, TOUR_WORD_LIMITS.bridge]
    ]),
    ['outro', tour.outro.text, TOUR_WORD_LIMITS.outro],
    ['fallback', tour.fallback.text, null]
  ]
  for (const [where, text, limit] of lines) {
    if (DASHES.test(text)) errors.push(`${where} contains an em or en dash`)
    const words = wordsOf(text).length
    if (limit !== null && words > limit) errors.push(`${where} has ${words} words, limit ${limit}`)
  }
  return errors
}
