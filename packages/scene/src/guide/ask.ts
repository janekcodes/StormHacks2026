'use client'

import type { Exhibit } from '@museum/content/schema'
import {
  TOUR_TOOL_NAMES,
  type GuideMessage,
  type GuideMode,
  type ToolCall,
  type ToolResponse,
  type VisitorContext
} from '@museum/guide/client'
import { executeToolCall } from './executor'
import { getSessionId } from './session'

export const MAX_TURNS = 6

export interface StreamOptions {
  exhibits: readonly Exhibit[]
  mode: GuideMode
  context: () => VisitorContext
  onText: (chunk: string, full: string) => void
  onTool?: (call: ToolCall) => void
  onStreamError?: (message: string) => void
  fetchImpl?: typeof fetch
  timeoutMs?: number
  signal?: AbortSignal
}

export class GuideRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? 'Something went wrong. Please try again.'
  } catch {
    return 'Something went wrong. Please try again.'
  }
}

/** One model turn: stream text and tool calls, run tools, return the extended history. */
export async function streamGuideTurn(history: GuideMessage[], opts: StreamOptions): Promise<GuideMessage[]> {
  const doFetch = opts.fetchImpl ?? fetch
  const res = await doFetch('/api/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: getSessionId(),
      messages: history,
      visitorContext: opts.context(),
      mode: opts.mode
    }),
    ...(opts.signal ? { signal: opts.signal } : {})
  })
  if (!res.ok) throw new GuideRequestError(res.status, await readError(res))
  if (!res.body) throw new GuideRequestError(res.status, 'No response stream.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const toolCalls: ToolCall[] = []

  // Set up abort handler to interrupt pending read
  const abortHandler = () => {
    reader.cancel().catch(() => {})
  }
  opts.signal?.addEventListener('abort', abortHandler, { once: true })

  const handleEvent = (raw: unknown) => {
    const event = raw as {
      type?: string
      text?: string
      id?: string
      name?: string
      args?: Record<string, unknown>
      thoughtSignature?: string
      error?: string
    }
    if (event.type === 'text' && typeof event.text === 'string') {
      text += event.text
      opts.onText(event.text, text)
    } else if (event.type === 'tool') {
      const call: ToolCall = { id: event.id ?? '', name: event.name as ToolCall['name'], args: event.args ?? {} }
      if (typeof event.thoughtSignature === 'string') call.thoughtSignature = event.thoughtSignature
      toolCalls.push(call)
      opts.onTool?.(call)
    } else if (event.type === 'error' && typeof event.error === 'string') {
      opts.onStreamError?.(event.error)
    }
  }

  try {
    for (;;) {
      if (opts.signal?.aborted) {
        await reader.cancel().catch(() => {})
        throw new Error('Aborted')
      }
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        nl = buffer.indexOf('\n')
        if (!line) continue
        try {
          handleEvent(JSON.parse(line))
        } catch {
          // Ignore malformed lines and keep streaming.
        }
      }
    }
  } finally {
    opts.signal?.removeEventListener('abort', abortHandler)
  }

  // Check again before executing tools
  if (opts.signal?.aborted) throw new Error('Aborted')

  const next: GuideMessage[] = [...history, { role: 'assistant', text, ...(toolCalls.length > 0 ? { toolCalls } : {}) }]
  if (toolCalls.length > 0) {
    const allowed = opts.mode === 'tour' ? TOUR_TOOL_NAMES : undefined
    const toolResponses: ToolResponse[] = toolCalls.map((call) => executeToolCall(call, opts.exhibits, allowed))
    next.push({ role: 'tool', toolResponses })
  }
  return next
}

/** Ask one question and run the tool loop to a final answer. Used by the tour. */
export async function askGuide(
  text: string,
  opts: StreamOptions
): Promise<{ ok: true } | { ok: false; error: string }> {
  let history: GuideMessage[] = [{ role: 'user', text }]
  let streamError: string | null = null

  // Determine timeout: default 12s in tour mode, no timeout in visit mode unless specified
  const timeoutMs = opts.timeoutMs ?? (opts.mode === 'tour' ? 12_000 : undefined)

  // Create AbortController with timeout timer
  const abortController = new AbortController()
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  if (timeoutMs !== undefined) {
    timeoutHandle = setTimeout(() => {
      timedOut = true
      abortController.abort()
    }, timeoutMs)
  }

  // Link caller-supplied signal to our controller
  const callerAbortHandler = () => {
    abortController.abort()
  }
  if (opts.signal) {
    opts.signal.addEventListener('abort', callerAbortHandler, { once: true })
  }

  const inner: StreamOptions = {
    ...opts,
    signal: abortController.signal,
    onStreamError: (message) => {
      streamError ??= message
      opts.onStreamError?.(message)
    }
  }

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      // Check before starting a turn
      if (abortController.signal.aborted) throw new Error('Aborted')
      history = await streamGuideTurn(history, inner)
      if (streamError) {
        return { ok: false, error: streamError }
      }
      const last = history[history.length - 1]
      if (last?.role === 'assistant' && !(last.toolCalls && last.toolCalls.length > 0)) break
    }
    return { ok: true }
  } catch (err) {
    if (timedOut) {
      return { ok: false, error: 'The guide took too long to answer.' }
    }
    if (abortController.signal.aborted && !timedOut) {
      return { ok: false, error: 'The question was cancelled.' }
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong. Please try again.' }
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle)
    if (opts.signal) {
      opts.signal.removeEventListener('abort', callerAbortHandler)
    }
  }
}
