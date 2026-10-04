import { z } from 'zod'
import { ExhibitIdSchema } from '@museum/content/schema'
import {
  buildContext,
  buildSystemPrompt,
  createGuideClient,
  GUIDE_TOOL_NAMES,
  TOUR_MODE_RULES,
  TOUR_TOOL_NAMES,
  type GuideMessage,
  type ToolCall,
  type VisitorContext
} from '@museum/guide'
import { exhibits, getExhibit, scopeVersion } from '../../../lib/museum-data'
import { rateLimited } from '../../../lib/rate-limit'

// The guide route is dynamic and server-only (holds GEMINI_API_KEY).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Gemini text + tool calls stream over several seconds; give the Vercel
// function enough time (Hobby caps at 60s).
export const maxDuration = 60

const toolCallSchema = z.object({
  id: z.string(),
  name: z.enum(GUIDE_TOOL_NAMES),
  args: z.record(z.unknown()),
  thoughtSignature: z.string().optional()
})

const toolResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  result: z.record(z.unknown())
})

const guideMessageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), text: z.string() }),
  z.object({
    role: z.literal('assistant'),
    text: z.string(),
    toolCalls: z.array(toolCallSchema).optional()
  }),
  z.object({ role: z.literal('tool'), toolResponses: z.array(toolResponseSchema) })
])

const visitorContextSchema = z.object({
  room: z.string().max(64),
  roomKey: z.string().max(16),
  nearestExhibitId: ExhibitIdSchema.nullable(),
  openPortalId: ExhibitIdSchema.nullable(),
  visitedIds: z.array(ExhibitIdSchema).max(200)
})

const requestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  messages: z.array(guideMessageSchema).min(1).max(40),
  visitorContext: visitorContextSchema,
  mode: z.enum(['visit', 'tour']).optional()
})

const MAX_OUTPUT_TOKENS = 600

function questionText(messages: GuideMessage[]): string {
  const first = messages.find((message) => message.role === 'user')
  return first?.role === 'user' ? first.text : ''
}

function toGuideMessages(raw: z.infer<typeof guideMessageSchema>[]): GuideMessage[] {
  return raw.map((message): GuideMessage => {
    if (message.role === 'user') return { role: 'user', text: message.text }
    if (message.role === 'assistant') {
      if (!message.toolCalls) return { role: 'assistant', text: message.text }
      const toolCalls: ToolCall[] = message.toolCalls.map((call) => {
        const out: ToolCall = { id: call.id, name: call.name, args: call.args }
        if (call.thoughtSignature) out.thoughtSignature = call.thoughtSignature
        return out
      })
      return { role: 'assistant', text: message.text, toolCalls }
    }
    return { role: 'tool', toolResponses: message.toolResponses }
  })
}

function toVisitorContext(raw: z.infer<typeof visitorContextSchema>): VisitorContext {
  return {
    room: raw.room,
    roomKey: raw.roomKey,
    nearestExhibitId: raw.nearestExhibitId,
    openPortalId: raw.openPortalId,
    visitedIds: raw.visitedIds
  }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GUIDE_MODEL

  if (!apiKey || !model) {
    return Response.json(
      { error: 'The guide is not configured yet. Set GEMINI_API_KEY and GUIDE_MODEL on the server.' },
      { status: 503 }
    )
  }

  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (await rateLimited(body.sessionId)) {
    return Response.json(
      { error: 'You have asked a lot of questions. Wait a moment and try again.' },
      { status: 429 }
    )
  }

  const messages = toGuideMessages(body.messages)

  // Log the question text only; never an IP or user ID.
  console.log('guide question:', questionText(messages))

  const visitor = toVisitorContext(body.visitorContext)
  const detailId = visitor.openPortalId ?? visitor.nearestExhibitId
  const exhibit = detailId ? getExhibit(detailId) : undefined
  const tour = body.mode === 'tour'
  const systemInstruction =
    buildSystemPrompt(exhibits, scopeVersion) +
    '\n\n' +
    buildContext(visitor, exhibit ?? null) +
    (tour ? '\n\n' + TOUR_MODE_RULES : '')

  const client = createGuideClient({
    apiKey,
    model,
    systemInstruction,
    ...(tour ? { tools: TOUR_TOOL_NAMES } : {})
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'))
      try {
        for await (const chunk of client.streamTurn(messages, { maxOutputTokens: MAX_OUTPUT_TOKENS })) {
          if (chunk.text) send({ type: 'text', text: chunk.text })
          for (const call of chunk.toolCalls) {
            send({
              type: 'tool',
              id: call.id,
              name: call.name,
              args: call.args,
              ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {})
            })
          }
        }
        send({ type: 'done' })
      } catch (error) {
        console.error('guide stream failed:', error instanceof Error ? error.message : error)
        send({ type: 'error', error: 'Something went wrong. Please try again.' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}
