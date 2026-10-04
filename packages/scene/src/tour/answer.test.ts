import { describe, expect, it, vi } from 'vitest'
import type { TourEvent } from './machine'
import { answerQuestion, type AnswerDeps } from './answer'

function deps(overrides: Partial<AnswerDeps> = {}) {
  const events: TourEvent[] = []
  let speaking = false
  const listeners = new Set<() => void>()
  const d: AnswerDeps = {
    dispatch: (event) => events.push(event),
    ask: vi.fn(async () => {
      speaking = true
      setTimeout(() => {
        speaking = false
        listeners.forEach((fn) => fn())
      }, 10)
      return { ok: true as const }
    }),
    setSpeakOverride: vi.fn(),
    finishSpeech: vi.fn(),
    isSpeaking: () => speaking,
    subscribeSpeech: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    stopSpeech: vi.fn(),
    playFallback: vi.fn(async () => undefined),
    speechTimeoutMs: 500,
    ...overrides
  }
  return { d, events }
}

describe('answerQuestion', () => {
  it('pauses as answering, resumes only after speech ends', async () => {
    const { d, events } = deps()
    const done = answerQuestion('Who was Ada?', d)
    await new Promise((resolve) => setTimeout(resolve, 3))
    expect(d.isSpeaking()).toBe(true)
    expect(events).toEqual([{ type: 'PAUSE', reason: 'answering' }])
    await done
    expect(d.isSpeaking()).toBe(false)
    expect(events).toEqual([{ type: 'PAUSE', reason: 'answering' }, { type: 'RESUME' }])
    expect(d.setSpeakOverride).toHaveBeenNthCalledWith(1, true)
    expect(d.setSpeakOverride).toHaveBeenLastCalledWith(false)
    expect(d.finishSpeech).toHaveBeenCalled()
  })

  it('plays the fallback line and resumes when the guide fails', async () => {
    const { d, events } = deps({ ask: vi.fn(async () => ({ ok: false as const, error: 'x' })) })
    await answerQuestion('Hi there', d)
    expect(d.stopSpeech).toHaveBeenCalled()
    expect(vi.mocked(d.stopSpeech).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(d.playFallback).mock.invocationCallOrder[0]!
    )
    expect(d.playFallback).toHaveBeenCalled()
    expect(events.at(-1)).toEqual({ type: 'RESUME' })
  })

  it('resumes at the safety timeout, not earlier, if speech never ends', async () => {
    const { d, events } = deps({
      ask: vi.fn(async () => ({ ok: true as const })),
      isSpeaking: () => true,
      speechTimeoutMs: 60
    })
    const start = Date.now()
    const done = answerQuestion('Hi there', d)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(events).toEqual([{ type: 'PAUSE', reason: 'answering' }])
    await done
    expect(Date.now() - start).toBeGreaterThanOrEqual(55)
    expect(events.at(-1)).toEqual({ type: 'RESUME' })
  })

  it('treats a rejected ask as a failure: fallback plays, resumes, resolves', async () => {
    const { d, events } = deps({ ask: vi.fn(async () => Promise.reject(new Error('boom'))) })
    await expect(answerQuestion('Hi there', d)).resolves.toBeUndefined()
    expect(d.playFallback).toHaveBeenCalled()
    expect(events.at(-1)).toEqual({ type: 'RESUME' })
  })

  it('still resumes when the fallback throws', async () => {
    const { d, events } = deps({
      ask: vi.fn(async () => ({ ok: false as const, error: 'x' })),
      playFallback: vi.fn(async () => Promise.reject(new Error('audio')))
    })
    await expect(answerQuestion('Hi there', d)).resolves.toBeUndefined()
    expect(events.at(-1)).toEqual({ type: 'RESUME' })
  })
})
