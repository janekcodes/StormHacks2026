import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (data?: unknown) => void
const fake = vi.hoisted(() => {
  const state: { handlers: Map<string, Handler[]>; commit: () => void; close: () => void } = {
    handlers: new Map(),
    commit: () => undefined,
    close: () => undefined
  }
  return state
})

vi.mock('@elevenlabs/client', () => ({
  CommitStrategy: { MANUAL: 'manual' },
  RealtimeEvents: {
    SESSION_STARTED: 'session_started',
    PARTIAL_TRANSCRIPT: 'partial_transcript',
    COMMITTED_TRANSCRIPT: 'committed_transcript',
    ERROR: 'error',
    CLOSE: 'close',
    OPEN: 'open'
  },
  Scribe: {
    connect: () => ({
      on: (event: string, fn: Handler) => {
        fake.handlers.set(event, [...(fake.handlers.get(event) ?? []), fn])
      },
      commit: () => fake.commit(),
      close: () => fake.close()
    })
  }
}))

import { connectScribe, OPEN_TIMEOUT_MS } from './scribe'

const emit = (event: string, data?: unknown) => fake.handlers.get(event)?.forEach((fn) => fn(data))
const closeSpy = vi.fn()

beforeEach(() => {
  fake.handlers = new Map()
  closeSpy.mockReset()
  fake.close = closeSpy
  fake.commit = vi.fn()
})
afterEach(() => vi.useRealTimers())

describe('connectScribe', () => {
  it('resolves on SESSION_STARTED without closing', async () => {
    const pending = connectScribe({ token: 't', modelId: 'm' })
    emit('session_started', {})
    const conn = await pending
    expect(closeSpy).not.toHaveBeenCalled()
    conn.commit()
    expect(fake.commit).toHaveBeenCalledTimes(1)
  })

  it('does not resolve on OPEN alone (microphone not started yet)', async () => {
    vi.useFakeTimers()
    const pending = connectScribe({ token: 't', modelId: 'm' })
    const outcome = pending.then(
      () => 'resolved',
      () => 'rejected'
    )
    emit('open')
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS - 1)
    expect(closeSpy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(await outcome).toBe('rejected')
  })

  it('rejects and closes on ERROR before start', async () => {
    const pending = connectScribe({ token: 't', modelId: 'm' })
    emit('error', { message_type: 'auth_error', error: 'bad' })
    await expect(pending).rejects.toThrow(/auth_error/)
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects and closes on CLOSE before start', async () => {
    const pending = connectScribe({ token: 't', modelId: 'm' })
    emit('close', {})
    await expect(pending).rejects.toThrow(/closed/)
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects and closes after the open timeout', async () => {
    vi.useFakeTimers()
    const pending = connectScribe({ token: 't', modelId: 'm' })
    const assertion = expect(pending).rejects.toThrow(/in time/)
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS)
    await assertion
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('does not double-settle on events after settle', async () => {
    vi.useFakeTimers()
    const pending = connectScribe({ token: 't', modelId: 'm' })
    emit('session_started', {})
    await pending
    emit('error', { message_type: 'error', error: 'late' })
    emit('close', {})
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS * 2)
    expect(closeSpy).not.toHaveBeenCalled()

    const failed = connectScribe({ token: 't', modelId: 'm' })
    const caught = failed.catch((e: Error) => e)
    emit('error', { message_type: 'error', error: 'first' })
    emit('close', {})
    emit('session_started', {})
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS * 2)
    expect(await caught).toBeInstanceOf(Error)
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })
})
