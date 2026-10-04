import { z } from 'zod'
import { EXHIBIT_IDS, ExhibitIdSchema } from '@museum/content/schema'

/** The five tools the guide can call (BLUEPRINT section 11). */
export const GUIDE_TOOL_NAMES = [
  'walkTo',
  'openPortal',
  'highlight',
  'startTour',
  'getVisitorContext'
] as const

export type GuideToolName = (typeof GUIDE_TOOL_NAMES)[number]

export const walkToArgsSchema = z.object({
  exhibitId: ExhibitIdSchema
})

export const openPortalArgsSchema = z.object({
  exhibitId: ExhibitIdSchema
})

export const highlightArgsSchema = z.object({
  exhibitIds: z.array(ExhibitIdSchema).min(1).max(8)
})

export const startTourArgsSchema = z.object({
  title: z.string().min(1).max(120),
  exhibitIds: z.array(ExhibitIdSchema).min(2).max(8)
})

export const getVisitorContextArgsSchema = z.object({})

export type WalkToArgs = z.infer<typeof walkToArgsSchema>
export type OpenPortalArgs = z.infer<typeof openPortalArgsSchema>
export type HighlightArgs = z.infer<typeof highlightArgsSchema>
export type StartTourArgs = z.infer<typeof startTourArgsSchema>

/** Argument schema for a tool name. Unknown names return an empty-object schema. */
export function toolArgumentSchema(name: GuideToolName): z.ZodTypeAny {
  switch (name) {
    case 'walkTo':
      return walkToArgsSchema
    case 'openPortal':
      return openPortalArgsSchema
    case 'highlight':
      return highlightArgsSchema
    case 'startTour':
      return startTourArgsSchema
    case 'getVisitorContext':
      return getVisitorContextArgsSchema
  }
}

/** A tool call proposed by the model, with the shape the client executes. */
export interface ToolCall {
  id: string
  name: GuideToolName
  args: Record<string, unknown>
  /** Echoed back to the model on the next turn so thinking models accept it. */
  thoughtSignature?: string
}

const EXHIBIT_ID_ENUM: string[] = [...EXHIBIT_IDS]

/**
 * Function declarations for Gemini. Kept as plain JSON-schema data (via
 * `parametersJsonSchema`) so this module stays client-safe: the SDK accepts
 * the exact shape without us importing `@google/genai` here.
 */
export interface GuideToolDeclaration {
  name: GuideToolName
  description: string
  parametersJsonSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export const GUIDE_TOOL_DECLARATIONS: GuideToolDeclaration[] = [
  {
    name: 'walkTo',
    description:
      'Walk the visitor to an exhibit viewing point. Use for any exhibit ID, built or planned.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        exhibitId: {
          type: 'string',
          enum: EXHIBIT_ID_ENUM,
          description: 'The exhibit ID to walk the visitor to.'
        }
      },
      required: ['exhibitId']
    }
  },
  {
    name: 'openPortal',
    description:
      'Open the hands-on portal for a built exhibit. Only built exhibits have a portal; do not call this for Core, Extended or Open slots.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        exhibitId: {
          type: 'string',
          enum: EXHIBIT_ID_ENUM,
          description: 'The built exhibit ID whose portal to open.'
        }
      },
      required: ['exhibitId']
    }
  },
  {
    name: 'highlight',
    description: 'Raise spotlights and mark 1 to 8 exhibits on the minimap.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        exhibitIds: {
          type: 'array',
          items: { type: 'string', enum: EXHIBIT_ID_ENUM },
          minItems: 1,
          maxItems: 8,
          description: 'Exhibit IDs to highlight.'
        }
      },
      required: ['exhibitIds']
    }
  },
  {
    name: 'startTour',
    description: 'Run a guided route through 2 to 8 exhibits, stop by stop.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A short title for the tour.' },
        exhibitIds: {
          type: 'array',
          items: { type: 'string', enum: EXHIBIT_ID_ENUM },
          minItems: 2,
          maxItems: 8,
          description: 'Ordered exhibit IDs for the tour.'
        }
      },
      required: ['title', 'exhibitIds']
    }
  },
  {
    name: 'getVisitorContext',
    description:
      'Return the visitor current room, facing direction, visited exhibits and passport progress.',
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
]

/** Tools allowed during the guided tour: nothing that moves the visitor off the route. */
export const TOUR_TOOL_NAMES: readonly GuideToolName[] = ['highlight', 'getVisitorContext']

export type GuideMode = 'visit' | 'tour'

export function toolDeclarationsFor(names?: readonly GuideToolName[]): GuideToolDeclaration[] {
  if (!names) return GUIDE_TOOL_DECLARATIONS
  return GUIDE_TOOL_DECLARATIONS.filter((tool) => names.includes(tool.name))
}
