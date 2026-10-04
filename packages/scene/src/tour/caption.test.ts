import { describe, expect, it } from 'vitest'
import { tourCaption } from './caption'

const base = {
  pauseReason: null,
  partial: '',
  voiceStatus: 'idle',
  guideCaption: null,
  thinking: false,
  tourCaption: 'First, the logic wing.'
} as const

describe('tourCaption', () => {
  it('shows the tour line normally', () => {
    expect(tourCaption(base)).toBe('First, the logic wing.')
    expect(tourCaption({ ...base, tourCaption: null })).toBeNull()
  })

  it('says the mic is starting until the session is live, then listening, then the partial', () => {
    expect(tourCaption({ ...base, pauseReason: 'listening', voiceStatus: 'idle' })).toBe('Starting the mic')
    expect(tourCaption({ ...base, pauseReason: 'listening', voiceStatus: 'listening' })).toBe('Listening')
    expect(tourCaption({ ...base, pauseReason: 'listening', voiceStatus: 'listening', partial: 'who built' })).toBe(
      'who built'
    )
    // Released, waiting for the final transcript: not "Starting the mic" again.
    expect(tourCaption({ ...base, pauseReason: 'listening', voiceStatus: 'finishing' })).toBe('Listening')
  })

  it('shows Thinking while the answer streams and nothing is spoken yet', () => {
    expect(tourCaption({ ...base, pauseReason: 'answering', thinking: true })).toBe('Thinking')
  })

  it('shows the sentence being spoken while answering', () => {
    expect(
      tourCaption({ ...base, pauseReason: 'answering', thinking: true, guideCaption: 'Alan Turing described it in 1936.' })
    ).toBe('Alan Turing described it in 1936.')
    expect(tourCaption({ ...base, pauseReason: 'answering', guideCaption: 'Last sentence.' })).toBe('Last sentence.')
  })

  it('keeps captioning speech that outlasts the answering pause', () => {
    expect(tourCaption({ ...base, guideCaption: 'Still talking.' })).toBe('Still talking.')
  })

  it('falls back to the tour caption (e.g. the fallback line) once the stream ended with nothing spoken', () => {
    expect(tourCaption({ ...base, pauseReason: 'answering', tourCaption: 'Sorry, ask me again.' })).toBe(
      'Sorry, ask me again.'
    )
  })
})
