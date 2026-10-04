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
    playFallback: vi.fn(async () => undefined),
    speechTimeoutMs: 500,
    ...overrides
  }
  return { d, events }
}

describe('answerQuestion', () => {
  it('pauses as answering, waits for speech to finish, then resumes', async () => {
    const { d, events } = deps()
    await answerQuestion('Who was Ada?', d)
    expect(events).toEqual([{ type: 'PAUSE', reason: 'answering' }, { type: 'RESUME' }])
    expect(d.setSpeakOverride).toHaveBeenNthCalledWith(1, true)
    expect(d.setSpeakOverride).toHaveBeenLastCalledWith(false)
    expect(d.finishSpeech).toHaveBeenCalled()
  })

  it('plays the fallback line and resumes when the guide fails', async () => {
    const { d, events } = deps({ ask: vi.fn(async () => ({ ok: false as const, error: 'x' })) })
    await answerQuestion('Hi there', d)
    expect(d.playFallback).toHaveBeenCalled()
    expect(events.at(-1)).toEqual({ type: 'RESUME' })
  })

  it('resumes after the safety timeout even if speech never ends', async () => {
    const { d, events } = deps({
      ask: vi.fn(async () => ({ ok: true as const })),
      isSpeaking: () => true,
      speechTimeoutMs: 30
    })
    await answerQuestion('Hi there', d)
    expect(events.at(-1)).toEqual({ type: 'RESUME' })
  })
})
