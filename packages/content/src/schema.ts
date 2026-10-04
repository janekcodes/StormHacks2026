import { z } from 'zod'

export const BANDS = ['prologue', 'inner', 'middle', 'outer'] as const
export const TIERS = ['built', 'core', 'extended', 'open'] as const

// The 77 exhibit IDs, generated from the registry (BLUEPRINT section 6).
export const EXHIBIT_IDS = [
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7',
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11',
  'G1', 'G2', 'G3',
  'S1', 'S2', 'S3', 'S4',
  'X1', 'X2'
] as const

export type ExhibitId = (typeof EXHIBIT_IDS)[number]

export const ExhibitIdSchema = z.enum(EXHIBIT_IDS)

export type Band = (typeof BANDS)[number]
export const BandSchema = z.enum(BANDS)

export type Tier = (typeof TIERS)[number]
export const TierSchema = z.enum(TIERS)

export const PositionSchema = z.object({
  x: z.number(),
  z: z.number(),
  face: z.tuple([z.number(), z.number()])
})
export type Position = z.infer<typeof PositionSchema>

/** Plan size of a built exhibit's stand, in metres. Model art arrives in plan 09. */
export const FootprintSchema = z.object({
  w: z.number(),
  d: z.number(),
  h: z.number(),
  floor: z.boolean()
})
export type Footprint = z.infer<typeof FootprintSchema>

/** How a built exhibit's object is represented in the scene. */
export const ModelKindSchema = z.enum(['glb', 'procedural'])
export type ModelKind = z.infer<typeof ModelKindSchema>

/** Mount type for a built exhibit's object. */
export const ModelFootprintSchema = z.enum(['plinth', 'floor'])
export type ModelFootprint = z.infer<typeof ModelFootprintSchema>

export const ModelSchema = z.object({
  kind: ModelKindSchema,
  footprint: ModelFootprintSchema
})
export type ExhibitModel = z.infer<typeof ModelSchema>

export const SourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string()
})
export type Source = z.infer<typeof SourceSchema>

export const StatSchema = z.object({
  k: z.string(),
  v: z.string(),
  sourceId: z.string()
})
export type Stat = z.infer<typeof StatSchema>

export const PortalSchema = z.object({
  package: z.string()
})
export type Portal = z.infer<typeof PortalSchema>

export const AudioSchema = z.object({
  src: z.string(),
  align: z.string(),
  voiceId: z.string(),
  modelId: z.string(),
  hash: z.string()
})
export type ExhibitAudio = z.infer<typeof AudioSchema>

const TBD_RE = /^\[TBD(?::[^\]]*)?\]$/

export interface SchemaOptions {
  allowTbd: boolean
}

export function makeExhibitSchema(options: SchemaOptions) {
  const { allowTbd } = options
  const isTbd = (value: string) => TBD_RE.test(value)

  const base = z.object({
    id: ExhibitIdSchema,
    year: z.string(),
    title: z.string(),
    zone: z.string(),
    band: BandSchema.nullable(),
    tier: TierSchema,
    position: PositionSchema,
    footprint: FootprintSchema.optional(),
    model: ModelSchema.optional(),
    portal: PortalSchema.optional(),
    caption: z.string().optional(),
    hook: z.string().optional(),
    stats: z.array(StatSchema).optional(),
    sources: z.array(SourceSchema).optional(),
    caveat: z.string().optional(),
    narration: z.string().optional(),
    audio: AudioSchema.optional()
  })

  return base.superRefine((exhibit, ctx) => {
    const add = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message })

    // TBD markers are allowed only while allowTbd is on. Plan 13 CI turns it off.
    if (!allowTbd) {
      const offenders: string[] = []
      const checkString = (label: string, value: string | undefined) => {
        if (value !== undefined && isTbd(value)) offenders.push(label)
      }
      checkString('caption', exhibit.caption)
      checkString('hook', exhibit.hook)
      checkString('narration', exhibit.narration)
      checkString('caveat', exhibit.caveat)
      for (const [index, stat] of (exhibit.stats ?? []).entries()) {
        checkString(`stats[${index}].k`, stat.k)
        checkString(`stats[${index}].v`, stat.v)
        checkString(`stats[${index}].sourceId`, stat.sourceId)
      }
      for (const [index, source] of (exhibit.sources ?? []).entries()) {
        checkString(`sources[${index}].id`, source.id)
        checkString(`sources[${index}].label`, source.label)
        checkString(`sources[${index}].url`, source.url)
      }
      if (offenders.length > 0) {
        add(`TBD markers are not allowed (offending fields: ${offenders.join(', ')})`)
      }
    }

    // Built tier refinements.
    if (exhibit.tier === 'built') {
      if (!exhibit.caption || exhibit.caption.trim() === '') {
        add('built exhibits require a caption')
      }
      if (!exhibit.stats || exhibit.stats.length !== 3) {
        add('built exhibits require exactly 3 stats')
      }
      if (!exhibit.sources || exhibit.sources.length === 0) {
        add('built exhibits require at least one source')
      }
      if (!exhibit.portal) {
        add('built exhibits require a portal')
      }
      const sourceIds = new Set((exhibit.sources ?? []).map((source) => source.id))
      for (const [index, stat] of (exhibit.stats ?? []).entries()) {
        const resolves = sourceIds.has(stat.sourceId) || (allowTbd && isTbd(stat.sourceId))
        if (!resolves) {
          add(`stats[${index}].sourceId "${stat.sourceId}" does not resolve to a declared source`)
        }
      }
    }

    // "first" claims require a caveat.
    const searchable = `${exhibit.title} ${exhibit.caption ?? ''}`.toLowerCase()
    if (searchable.includes('first')) {
      if (!exhibit.caveat || exhibit.caveat.trim() === '') {
        add('exhibits that claim "first" require a caveat')
      }
    }
  })
}

export type Exhibit = z.infer<ReturnType<typeof makeExhibitSchema>>

// Default: TBD markers allowed (plans 02 to 12). Strict: no TBD markers (plan 13 CI).
export const ExhibitSchema = makeExhibitSchema({ allowTbd: true })
export const StrictExhibitSchema = makeExhibitSchema({ allowTbd: false })

export const ExhibitsFileSchema = z.object({
  scopeVersion: z.string(),
  exhibits: z.array(ExhibitSchema)
})
