import { describe, expect, it, vi } from 'vitest'
import { requestListenToken } from './listen-token'

const env = { ELEVENLABS_API_KEY: 'secret-key', LISTEN_MODEL: 'scribe_v2_realtime' }

describe('requestListenToken', () => {
  it('asks ElevenLabs for a realtime scribe token with the server key', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ token: 'tok' }))
    const out = await requestListenToken(env, fetchImpl)
    expect(out).toEqual({ status: 200, body: { token: 'tok', modelId: 'scribe_v2_realtime' } })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('secret-key')
  })

  it('never returns the key', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ token: 'tok' }))
    const out = await requestListenToken(env, fetchImpl)
    expect(JSON.stringify(out)).not.toContain('secret-key')
  })

  it('503 when not configured, without calling upstream', async () => {
    const fetchImpl = vi.fn()
    expect((await requestListenToken({}, fetchImpl)).status).toBe(503)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('502 when upstream fails or returns no token', async () => {
    expect((await requestListenToken(env, vi.fn(async () => new Response('no', { status: 401 })))).status).toBe(502)
    expect((await requestListenToken(env, vi.fn(async () => Response.json({})))).status).toBe(502)
    expect((await requestListenToken(env, vi.fn(async () => Promise.reject(new Error('down'))))).status).toBe(502)
  })

  it('passes an abort signal upstream and returns 502 when the request aborts', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException('The operation was aborted', 'AbortError')
    })
    const out = await requestListenToken(env, fetchImpl as unknown as typeof fetch)
    expect(out.status).toBe(502)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})
