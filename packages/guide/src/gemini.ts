import { GoogleGenAI, type Content, type Part } from '@google/genai'
import { toolDeclarationsFor, type GuideToolName, type ToolCall } from './tools'
import type { GuideMessage, ToolResponse } from './protocol'

export interface GuideClientOptions {
  apiKey: string
  model: string
  systemInstruction: string
  /** Restrict the tools offered to the model. Defaults to every tool. */
  tools?: readonly GuideToolName[]
}

export interface GuideTurnConfig {
  maxOutputTokens?: number
  temperature?: number
}

export interface GuideTurn {
  text: string
  toolCalls: ToolCall[]
}

export interface GuideClient {
  /** Non-streaming turn: full text plus proposed tool calls. Used by evals. */
  runTurn: (messages: GuideMessage[], config?: GuideTurnConfig) => Promise<GuideTurn>
  /** Streaming turn yielding text deltas and tool calls. Used by the route. */
  streamTurn: (
    messages: GuideMessage[],
    config?: GuideTurnConfig
  ) => AsyncGenerator<{ text: string; toolCalls: ToolCall[] }>
}

/**
 * A function call sits on a Part next to its `thoughtSignature`. Thinking
 * models require that signature to be echoed back on the next turn, so keep it
 * alongside the call (the SDK's `response.functionCalls` getter drops it).
 */
function callFromPart(part: Part): ToolCall | null {
  const call = part.functionCall
  if (!call) return null
  const out: ToolCall = {
    id: call.id ?? '',
    name: (call.name ?? '') as ToolCall['name'],
    args: (call.args ?? {}) as Record<string, unknown>
  }
  if (part.thoughtSignature) out.thoughtSignature = part.thoughtSignature
  return out
}

function callsFromParts(parts: Part[] | undefined): ToolCall[] {
  const out: ToolCall[] = []
  for (const part of parts ?? []) {
    const call = callFromPart(part)
    if (call) out.push(call)
  }
  return out
}

function toolResponsesToParts(responses: ToolResponse[]): NonNullable<Content['parts']> {
  return responses.map((response) => ({
    functionResponse: {
      id: response.id,
      name: response.name,
      response: response.result
    }
  }))
}

/** Map the client message protocol onto Gemini contents. */
function toContents(messages: GuideMessage[]): Content[] {
  const contents: Content[] = []
  for (const message of messages) {
    if (message.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: message.text }] })
      continue
    }
    if (message.role === 'assistant') {
      const parts: NonNullable<Content['parts']> = []
      if (message.text) parts.push({ text: message.text })
      for (const call of message.toolCalls ?? []) {
        const part: Part = { functionCall: { id: call.id, name: call.name, args: call.args } }
        if (call.thoughtSignature) part.thoughtSignature = call.thoughtSignature
        parts.push(part)
      }
      contents.push({ role: 'model', parts })
      continue
    }
    // role === 'tool': function responses go in a user content.
    contents.push({ role: 'user', parts: toolResponsesToParts(message.toolResponses) })
  }
  return contents
}

/**
 * Wrap the Google Gen AI SDK into a stateless client. The model ID is always
 * passed in (never hardcoded), per BLUEPRINT section 0 rule 10.
 */
export function createGuideClient(options: GuideClientOptions): GuideClient {
  const ai = new GoogleGenAI({ apiKey: options.apiKey })
  const { model, systemInstruction } = options

  const configFor = (config?: GuideTurnConfig) => ({
    systemInstruction,
    tools: [{ functionDeclarations: toolDeclarationsFor(options.tools) }],
    ...(config?.maxOutputTokens !== undefined ? { maxOutputTokens: config.maxOutputTokens } : {}),
    ...(config?.temperature !== undefined ? { temperature: config.temperature } : {})
  })

  return {
    async runTurn(messages, config) {
      const response = await ai.models.generateContent({
        model,
        contents: toContents(messages),
        config: configFor(config)
      })
      return {
        text: response.text ?? '',
        toolCalls: callsFromParts(response.candidates?.[0]?.content?.parts)
      }
    },
    async *streamTurn(messages, config) {
      const stream = await ai.models.generateContentStream({
        model,
        contents: toContents(messages),
        config: configFor(config)
      })
      let lastLength = 0
      const seen = new Set<string>()
      for await (const chunk of stream) {
        const full = chunk.text ?? ''
        if (full.length > lastLength) {
          yield { text: full.slice(lastLength), toolCalls: [] }
          lastLength = full.length
        }
        for (const call of callsFromParts(chunk.candidates?.[0]?.content?.parts)) {
          const key = call.id || `${call.name}:${JSON.stringify(call.args)}`
          if (!seen.has(key)) {
            seen.add(key)
            yield { text: '', toolCalls: [call] }
          }
        }
      }
    }
  }
}
