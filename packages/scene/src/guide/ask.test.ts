import { describe, expect, it, vi } from 'vitest'
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
})
