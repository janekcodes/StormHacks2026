import { describe, expect, it, vi } from 'vitest'
import { createVoiceController, type ScribeConnection, type VoiceStatus } from './controller'

function fakeConnection() {
  const handlers = {
    partial: [] as Array<(text: string) => void>,
    committed: [] as Array<(text: string) => void>,
    error: [] as Array<(error: unknown) => void>
  }
  const conn: ScribeConnection & {
    emitPartial(text: string): void
    emitCommitted(text: string): void
    emitError(): void
  } = {
    onPartial: (fn) => handlers.partial.push(fn),
    onCommitted: (fn) => handlers.committed.push(fn),
    onError: (fn) => handlers.error.push(fn),
    commit: vi.fn(),
    close: vi.fn(),
    emitPartial: (text) => handlers.partial.forEach((fn) => fn(text)),
    emitCommitted: (text) => handlers.committed.forEach((fn) => fn(text)),
    emitError: () => handlers.error.forEach((fn) => fn(new Error('socket')))
  }
  return conn
}

function setup(conn = fakeConnection()) {
  const statuses: VoiceStatus[] = []
  const partials: string[] = []
  const getToken = vi.fn(async () => ({ token: 't', modelId: 'm' }))
  const controller = createVoiceController({
    getToken,
    connect: () => conn,
    onPartial: (text) => partials.push(text),
    onStatus: (status) => statuses.push(status),
    finalTimeoutMs: 50
  })
  return { controller, conn, statuses, partials, getToken }
}

describe('createVoiceController', () => {
  it('streams partials and returns the committed text on release', async () => {
    const t = setup()
    await t.controller.start()
    t.conn.emitPartial('who wrote')
    const done = t.controller.stop()
    expect(t.conn.commit).toHaveBeenCalled()
    t.conn.emitCommitted('Who wrote the first program?')
    expect(await done).toBe('Who wrote the first program?')
    expect(t.partials).toEqual(['who wrote'])
    expect(t.conn.close).toHaveBeenCalled()
    expect(t.statuses).toEqual(['listening', 'finishing', 'idle'])
  })

  it('falls back to the last partial when no commit arrives in time', async () => {
    const t = setup()
    await t.controller.start()
    t.conn.emitPartial('what is ENIAC')
    expect(await t.controller.stop()).toBe('what is ENIAC')
  })

  it('returns null for fewer than two words', async () => {
    const t = setup()
    await t.controller.start()
    t.conn.emitPartial('um')
    expect(await t.controller.stop()).toBeNull()
  })

  it('returns null when released before anything was heard', async () => {
    const t = setup()
    await t.controller.start()
    expect(await t.controller.stop()).toBeNull()
  })

  it('uses a prefetched token once, then fetches a fresh one', async () => {
    const t = setup()
    t.controller.prefetch()
    await t.controller.start()
    await t.controller.stop()
    await t.controller.start()
    await t.controller.stop()
    expect(t.getToken).toHaveBeenCalledTimes(3) // prefetch, refill after first use, refill after second
  })

  it('becomes unavailable on token failure or socket error', async () => {
    const t = setup()
    t.getToken.mockRejectedValueOnce(new Error('503'))
    await t.controller.start()
    expect(t.statuses.at(-1)).toBe('unavailable')
    expect(await t.controller.stop()).toBeNull()

    const u = setup()
    await u.controller.start()
    u.conn.emitError()
    expect(u.statuses.at(-1)).toBe('unavailable')
    expect(u.conn.close).toHaveBeenCalled()
  })
})
