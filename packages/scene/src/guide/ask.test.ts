import { describe, expect, it, vi, afterEach } from 'vitest'

const walkTo = vi.fn(() => true)
vi.mock('../nav/api', () => ({ museum: { walkTo: (...args: unknown[]) => (walkTo as (...a: unknown[]) => boolean)(...args) } }))
const requestOpen = vi.fn()
vi.mock('../exhibits/open', () => ({ requestOpen: (...args: unknown[]) => requestOpen(...args) }))

import { askGuide } from './ask'

function ndjson(events: unknown[]): Response {
  const body = events.map((event) => JSON.stringify(event)).join('\n') + '\n'
  return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } })
}

function ctx() {
  return { room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }
}

describe('askGuide', () => {
  it('streams text to onText and sends tour mode', async () => {
    const fetchImpl = vi.fn(async () =>
      ndjson([{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'there.' }, { type: 'done' }])
    )
    const chunks: string[] = []
    const out = await askGuide('Who was Turing?', {
      exhibits: [],
      mode: 'tour',
      context: () => ({ room: 'A', roomKey: 'A', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
      onText: (text) => chunks.push(text),
      fetchImpl
    })
    expect(out).toEqual({ ok: true })
    expect(chunks.join('')).toBe('Hello there.')
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.mode).toBe('tour')
    expect(body.messages).toEqual([{ role: 'user', text: 'Who was Turing?' }])
  })

  it('returns the server error message on a failed request', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ error: 'Busy.' }, { status: 429 }))
    const out = await askGuide('Hi', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      fetchImpl
    })
    expect(out).toEqual({ ok: false, error: 'Busy.' })
  })

  it('rejects walkTo in tour mode before the scene moves the visitor', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ndjson([{ type: 'tool', id: 'c1', name: 'walkTo', args: { exhibitId: 'B3' } }, { type: 'done' }]))
      .mockResolvedValueOnce(ndjson([{ type: 'text', text: 'Done.' }, { type: 'done' }]))
    const out = await askGuide('Take me to B3', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      fetchImpl
    })
    expect(out).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const second = JSON.parse((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)
    const toolMsg = second.messages.find((m: { role: string }) => m.role === 'tool')
    expect(toolMsg.toolResponses[0].result.ok).toBe(false)
    expect(toolMsg.toolResponses[0].result.error).toMatch(/tour/)
    expect(walkTo).not.toHaveBeenCalled()
    expect(requestOpen).not.toHaveBeenCalled()
  })

  it('returns an in-stream error even when the HTTP status is 200', async () => {
    const fetchImpl = vi.fn(async () =>
      ndjson([{ type: 'text', text: 'Partial' }, { type: 'error', error: 'Model failed.' }, { type: 'done' }])
    )
    const out = await askGuide('Hi', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      fetchImpl
    })
    expect(out).toEqual({ ok: false, error: 'Model failed.' })
  })

  it('times out a stream that stalls after its first chunk and cancels the body', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'text', text: 'Hello ' }) + '\n'))
        // never closes: the stream stalls after one chunk
      },
      cancel
    })
    const chunks: string[] = []
    const fetchImpl = vi.fn(async () => new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } }))
    const pending = askGuide('Hi there', { exhibits: [], mode: 'tour', timeoutMs: 100, context: ctx, onText: (t) => chunks.push(t), fetchImpl })

    await vi.waitFor(() => expect(chunks).toEqual(['Hello ']))
    expect(chunks).toEqual(['Hello '])

    await expect(pending).resolves.toEqual({ ok: false, error: 'The guide took too long to answer.' })
    expect(cancel).toHaveBeenCalled()
  })

  it('times out fetch rejecting on abort with Node message "This operation was aborted"', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      const signal = init.signal
      return new Promise<Response>((_, reject) => {
        signal?.addEventListener('abort', () => {
          // Node's error message (different from Firefox)
          reject(new DOMException('This operation was aborted', 'AbortError'))
        })
        // Never resolve or reject naturally
      })
    })
    const promise = askGuide('Hi', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      timeoutMs: 50,
      fetchImpl
    })
    // Advance timers to trigger the timeout
    vi.advanceTimersByTime(100)
    const out = await promise
    expect(out).toEqual({ ok: false, error: 'The guide took too long to answer.' })
    vi.useRealTimers()
  })

  it('returns "The question was cancelled." when caller signal aborts', async () => {
    vi.useFakeTimers()
    const callerController = new AbortController()
    const removeEventListenerSpy = vi.spyOn(callerController.signal, 'removeEventListener')
    const fetchImpl = vi.fn(async () => {
      // Hang forever waiting for abort
      return new Promise<Response>((_, reject) => {
        callerController.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted by caller', 'AbortError'))
        })
      })
    })
    const promise = askGuide('Hi', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      signal: callerController.signal,
      fetchImpl
    })
    // Abort from caller (not timeout)
    vi.advanceTimersByTime(10)
    callerController.abort()
    vi.advanceTimersByTime(10)
    const out = await promise
    expect(out).toEqual({ ok: false, error: 'The question was cancelled.' })
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    vi.useRealTimers()
  })

  it('times out during tool execution, preventing a second fetch', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        ndjson([{ type: 'tool', id: 'c1', name: 'getVisitorContext', args: {} }, { type: 'done' }])
      )
      .mockResolvedValueOnce(ndjson([{ type: 'text', text: 'Done.' }, { type: 'done' }]))

    const pending = askGuide('Tell me context', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      onTool: () => {
        // Fire the timeout during tool handling
        vi.advanceTimersByTime(60)
      },
      timeoutMs: 50,
      fetchImpl
    })

    await expect(pending).resolves.toEqual({ ok: false, error: 'The guide took too long to answer.' })
    // Should have only called fetch once (the timeout prevented the second turn)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('returns cancellation error if signal is already aborted when called', async () => {
    const abortedController = new AbortController()
    abortedController.abort()
    const fetchImpl = vi.fn()
    const out = await askGuide('Hi', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      signal: abortedController.signal,
      fetchImpl
    })
    expect(out).toEqual({ ok: false, error: 'The question was cancelled.' })
    // Should not have made a fetch
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns ok: true for a fast answer and leaves no pending timer', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(async () =>
      ndjson([{ type: 'text', text: 'Quick.' }, { type: 'done' }])
    )
    const out = await askGuide('Hi', {
      exhibits: [],
      mode: 'tour',
      context: ctx,
      onText: () => undefined,
      timeoutMs: 5000,
      fetchImpl
    })
    expect(out).toEqual({ ok: true })
    const timerCount = vi.getTimerCount()
    expect(timerCount).toBe(0)
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
