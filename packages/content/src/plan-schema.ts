import { z } from 'zod'

// Two schemas live here:
// 1. PlanInputSchema: the authored file `packages/content/data/plan.json` (plan pixels).
// 2. BuildingSchema: the generated output `packages/content/generated/building.json` (metres).

const PointSchema = z.tuple([z.number(), z.number()])
const LineSchema = z.tuple([z.number(), z.number(), z.number(), z.number()])

export const PlanInputSchema = z.object({
  origin: PointSchema,
  scale: z.number().positive(),
  atriumR: z.number().positive(),
  concourseR: z.number().positive(),
  outline: z.array(PointSchema).min(3),
  outlineTail: z.array(PointSchema).min(2),
  bulge: z.object({
    fromX: z.number(),
    toX: z.number(),
    baseY: z.number(),
    amplitude: z.number(),
    count: z.number().int().positive()
  }),
  entranceGap: z.tuple([z.number().int(), z.number().int()]),
  sectors: z
    .array(
      z.object({
        angle: z.number(),
        zone: z.string()
      })
    )
    .min(1),
  seSplit: z.object({
    angle: z.number(),
    society: z.tuple([z.number(), z.number()]),
    futureLab: z.tuple([z.number(), z.number()])
  }),
  southSplit: z.object({
    peopleMaxX: z.number(),
    shopMinX: z.number(),
    alcoveCapY: z.number()
  }),
  doors: z.object({
    radial: z.object({ widthPx: z.number(), positions: z.array(z.number()) }),
    frontWall: z.object({ widthPx: z.number(), positions: z.array(z.number()) }),
    seSplit: z.object({ widthPx: z.number(), positions: z.array(z.number()) }),
    concourse: z.object({ widthPx: z.number(), positions: z.array(z.number()) }),
    alcove: z.object({ widthPx: z.number(), positions: z.array(z.number()) })
  }),
  atriumGlassGap: z.object({
    widthPx: z.number(),
    sides: z.array(z.string())
  }),
  bands: z.number().int().positive()
})

export type PlanInput = z.infer<typeof PlanInputSchema>

export const WallKindSchema = z.enum(['ext', 'int'])

export const RoomSchema = z.object({
  key: z.string(),
  name: z.string(),
  tint: z.string(),
  ink: z.string(),
  poly: z.array(PointSchema)
})

export const MarkSchema = z.object({
  p: PointSchema,
  u: PointSchema,
  t: z.string()
})

export const SignSchema = z.object({
  p: PointSchema,
  u: PointSchema,
  k: z.string()
})

export const BuildingSchema = z.object({
  outline: z.array(PointSchema),
  walls: z.array(z.tuple([z.number(), z.number(), z.number(), z.number(), WallKindSchema])),
  lintels: z.array(LineSchema),
  glass: z.array(LineSchema),
  rooms: z.array(RoomSchema),
  dashes: z.array(LineSchema),
  marks: z.array(MarkSchema),
  signs: z.array(SignSchema),
  zones: z.record(z.object({ name: z.string(), ink: z.string() })),
  entrance: z.tuple([PointSchema, PointSchema]),
  ra: z.number(),
  rc: z.number(),
  meta: z.object({
    scale_m_per_plan_px: z.number(),
    plan_origin_px: PointSchema,
    note: z.string()
  })
})

export type Building = z.infer<typeof BuildingSchema>
