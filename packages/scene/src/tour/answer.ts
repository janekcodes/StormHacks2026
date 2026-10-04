'use client'

import type { TourEvent } from './machine'

export interface AnswerDeps {
  dispatch: (event: TourEvent) => void
  ask: (text: string) => Promise<{ ok: true } | { ok: false; error: string }>
  setSpeakOverride: (on: boolean) => void
  finishSpeech: () => void
  isSpeaking: () => boolean
  subscribeSpeech: (fn: () => void) => () => void
  playFallback: () => Promise<void>
  /** Never wait longer than this for the spoken answer (stage safety). */
  speechTimeoutMs?: number
}

function waitForSilence(deps: AnswerDeps, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (!deps.isSpeaking()) return resolve()
    const timer = setTimeout(done, timeoutMs)
    const off = deps.subscribeSpeech(() => {
      if (!deps.isSpeaking()) done()
    })
    function done() {
      clearTimeout(timer)
      off()
      resolve()
    }
  })
}

/** Question flow during the tour: pause, ask, speak, resume. Always resumes. */
export async function answerQuestion(text: string, deps: AnswerDeps): Promise<void> {
  deps.dispatch({ type: 'PAUSE', reason: 'answering' })
  deps.setSpeakOverride(true)
  try {
    const result = await deps.ask(text).catch((err: unknown) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : 'ask failed'
    }))
    deps.finishSpeech()
    if (result.ok) {
      // Give the first sentence a moment to start before checking for silence.
      await new Promise((resolve) => setTimeout(resolve, 0))
      await waitForSilence(deps, deps.speechTimeoutMs ?? 30_000)
    } else {
      await deps.playFallback().catch(() => undefined)
    }
  } finally {
    deps.setSpeakOverride(false)
    deps.dispatch({ type: 'RESUME' })
  }
}
