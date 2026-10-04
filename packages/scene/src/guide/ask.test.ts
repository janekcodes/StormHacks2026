import { describe, expect, it, vi } from 'vitest'

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
})
