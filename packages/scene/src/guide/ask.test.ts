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
      context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
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
      context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
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
      context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
      onText: () => undefined,
      fetchImpl
    })
    expect(out).toEqual({ ok: false, error: 'Model failed.' })
  })

  it('times out a stalled stream with timeoutMs: 50', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () => {
        // Return a response with a ReadableStream that never ends
        return new Response(
          new ReadableStream(() => {
            // Never close or error; just hang
          }),
          { headers: { 'Content-Type': 'application/x-ndjson' } }
        )
      })

      const promise = askGuide('Hi', {
        exhibits: [],
        mode: 'tour',
        context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
        onText: () => undefined,
        timeoutMs: 50,
        fetchImpl
      })

      // Advance past timeout to trigger abort
      vi.advanceTimersByTime(100)
      const out = await promise
      expect(out).toEqual({ ok: false, error: 'The guide took too long to answer.' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('times out fetch rejecting on abort with Node message "This operation was aborted"', async () => {
    vi.useFakeTimers()
    try {
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
        context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
        onText: () => undefined,
        timeoutMs: 50,
        fetchImpl
      })
      // Advance timers to trigger the timeout
      vi.advanceTimersByTime(100)
      const out = await promise
      expect(out).toEqual({ ok: false, error: 'The guide took too long to answer.' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns "The question was cancelled." when caller signal aborts', async () => {
    vi.useFakeTimers()
    try {
      const callerController = new AbortController()
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
        context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
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
    } finally {
      vi.useRealTimers()
    }
  })

  it('times out during tool execution, preventing a second fetch', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          ndjson([{ type: 'tool', id: 'c1', name: 'walkTo', args: { exhibitId: 'B3' } }, { type: 'done' }])
        )
        // This second call should never happen if timeout fires during tool execution
        .mockResolvedValueOnce(ndjson([{ type: 'text', text: 'Done.' }, { type: 'done' }]))

      const promise = askGuide('Take me to B3', {
        exhibits: [],
        mode: 'tour',
        context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
        onText: () => undefined,
        timeoutMs: 100,
        fetchImpl
      })

      // Advance past the timeout before tool execution completes
      vi.advanceTimersByTime(150)
      const out = await promise

      // Should timeout, not complete successfully
      expect(out).toEqual({ ok: false, error: 'The guide took too long to answer.' })
      // Should have only called fetch once (the timeout prevented the second turn)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns ok: true for a fast answer and leaves no pending timer', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(async () =>
        ndjson([{ type: 'text', text: 'Quick.' }, { type: 'done' }])
      )
      const out = await askGuide('Hi', {
        exhibits: [],
        mode: 'tour',
        context: () => ({ room: '', roomKey: '', nearestExhibitId: null, openPortalId: null, visitedIds: [] }),
        onText: () => undefined,
        timeoutMs: 5000,
        fetchImpl
      })
      expect(out).toEqual({ ok: true })
      const timerCount = vi.getTimerCount()
      expect(timerCount).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
