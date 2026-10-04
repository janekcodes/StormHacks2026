import { describe, expect, it, vi } from 'vitest'
import { createVoiceController, type ScribeConnection, type VoiceStatus } from './controller'

function fakeConnection() {
  const handlers = {
    partial: [] as Array<(text: string) => void>,
    committed: [] as Array<(text: string) => void>,
    error: [] as Array<(error: unknown) => void>,
    close: [] as Array<() => void>
  }
  const conn: ScribeConnection & {
    emitPartial(text: string): void
    emitCommitted(text: string): void
    emitError(): void
    emitClose(): void
  } = {
    onPartial: (fn) => handlers.partial.push(fn),
    onCommitted: (fn) => handlers.committed.push(fn),
    onError: (fn) => handlers.error.push(fn),
    onClose: (fn) => handlers.close.push(fn),
    commit: vi.fn(),
    close: vi.fn(),
    emitPartial: (text) => handlers.partial.forEach((fn) => fn(text)),
    emitCommitted: (text) => handlers.committed.forEach((fn) => fn(text)),
    emitError: () => handlers.error.forEach((fn) => fn(new Error('socket'))),
    emitClose: () => handlers.close.forEach((fn) => fn())
  }
  return conn
}

function setup(conn = fakeConnection(), extra: { now?: () => number; finalTimeoutMs?: number } = {}) {
  const statuses: VoiceStatus[] = []
  const partials: string[] = []
  const getToken = vi.fn(async () => ({ token: 't', modelId: 'm' }))
  const connectFn = vi.fn(async (): Promise<ScribeConnection> => conn)
  const controller = createVoiceController({
    getToken,
    connect: connectFn,
    onPartial: (text) => partials.push(text),
    onStatus: (status) => statuses.push(status),
    finalTimeoutMs: 50,
    ...extra
  })
  return { controller, conn, statuses, partials, getToken, connectFn }
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

  it('cancels a press released while the token is still loading', async () => {
    const t = setup()
    let release!: (v: { token: string; modelId: string }) => void
    t.getToken.mockReturnValueOnce(new Promise((r) => (release = r)))
    const starting = t.controller.start()
    expect(await t.controller.stop()).toBeNull()
    release({ token: 't', modelId: 'm' })
    await starting
    expect(t.connectFn).not.toHaveBeenCalled()
    expect(t.statuses).not.toContain('listening')
    expect(t.statuses.at(-1) ?? 'idle').toBe('idle')
  })

  it('closes a connection that finished opening after release', async () => {
    const t = setup()
    let open!: (c: ScribeConnection) => void
    t.connectFn.mockReturnValueOnce(new Promise((r) => (open = r)))
    const starting = t.controller.start()
    await new Promise((r) => setTimeout(r, 0))
    expect(t.connectFn).toHaveBeenCalledTimes(1)
    expect(await t.controller.stop()).toBeNull()
    open(t.conn)
    await starting
    expect(t.conn.close).toHaveBeenCalledTimes(1)
    expect(t.statuses).not.toContain('listening')
    expect(t.statuses.at(-1) ?? 'idle').toBe('idle')
  })

  it('ignores a second start while one is pending or active', async () => {
    const t = setup()
    const a = t.controller.start()
    const b = t.controller.start()
    await Promise.all([a, b])
    await t.controller.start()
    expect(t.connectFn).toHaveBeenCalledTimes(1)
    expect(t.getToken).toHaveBeenCalledTimes(2) // one for the press, one refill
  })

  it('resolves stop immediately on an error while finishing, closing once', async () => {
    const t = setup(fakeConnection(), { finalTimeoutMs: 5000 })
    await t.controller.start()
    t.conn.emitPartial('hello there')
    const started = Date.now()
    const done = t.controller.stop()
    t.conn.emitError()
    expect(await done).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
    expect(t.conn.close).toHaveBeenCalledTimes(1)
    expect(t.statuses.at(-1)).toBe('unavailable')
  })

  it('treats an unexpected close while listening as unavailable', async () => {
    const t = setup()
    await t.controller.start()
    t.conn.emitClose()
    expect(t.statuses.at(-1)).toBe('unavailable')
  })

  it('does not treat its own close as a failure', async () => {
    const t = setup()
    await t.controller.start()
    t.conn.emitPartial('two words')
    await t.controller.stop()
    t.conn.emitClose()
    expect(t.statuses.at(-1)).toBe('idle')
  })

  it('discards a prefetched token older than ten minutes', async () => {
    let clock = 0
    const t = setup(fakeConnection(), { now: () => clock })
    t.controller.prefetch()
    clock = 11 * 60 * 1000
    await t.controller.start()
    expect(t.getToken).toHaveBeenCalledTimes(3) // stale prefetch, fresh fetch, refill
  })

  it('keeps a recent prefetched token', async () => {
    let clock = 0
    const t = setup(fakeConnection(), { now: () => clock })
    t.controller.prefetch()
    clock = 5 * 60 * 1000
    await t.controller.start()
    expect(t.getToken).toHaveBeenCalledTimes(2) // prefetch reused, plus refill
  })

  it('resolves null when commit throws', async () => {
    const t = setup()
    await t.controller.start()
    t.conn.emitPartial('hello there')
    t.conn.commit = vi.fn(() => {
      throw new Error('closed')
    })
    expect(await t.controller.stop()).toBeNull()
    expect(t.statuses.at(-1)).toBe('unavailable')
  })
})
