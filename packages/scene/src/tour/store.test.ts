import { describe, expect, it, vi } from 'vitest'
import type { Tour } from '@museum/content/tour-schema'
import type { ExhibitId } from '@museum/content/schema'
import { CLIP_GRACE_MS, MISSING_CLIP_MS } from './machine'
import type { TourEffect, TourLineKey } from './machine'
import { tourContext, useTourStore } from './store'

const tour: Tour = {
  id: 'test-tour',
  title: 'Test Tour',
  intro: {
    text: 'Welcome to the tour'
  },
  stops: [
    {
      exhibitId: 'A1' as ExhibitId,
      bridge: {
        text: 'Moving to the first stop'
      },
      line: {
        text: 'Line without audio'
      }
    },
    {
      exhibitId: 'B2' as ExhibitId,
      bridge: {
        text: 'Moving to the second stop'
      },
      line: {
        text: 'This is a line with audio',
        durationMs: 5000,
        audio: {
          src: 'audio.mp3',
          align: 'align.json',
          voiceId: 'voice123',
          modelId: 'model123',
          hash: 'hash123'
        }
      }
    }
  ],
  outro: {
    text: 'Thank you for visiting'
  },
  fallback: {
    text: 'Welcome to the museum'
  }
}

describe('tourContext().clipMs', () => {
  const ctx = tourContext(tour)

  it('a line with audio and durationMs returns duration plus grace', () => {
    const ms = ctx.clipMs('stop:1')
    expect(ms).toBe(5000 + CLIP_GRACE_MS)
  })

  it('a stop line without audio estimates from its text length', () => {
    const ms = ctx.clipMs('stop:0')
    // stop[0].line text is 'Line without audio': 3 words, 3 * 400 = 1200, minimum 1500
    expect(ms).toBe(1500)
  })

  it('a bridge key resolves to the bridge line', () => {
    // 'Moving to the first stop' is 5 words: 5 * 400 = 2000
    const ms = ctx.clipMs('bridge:0')
    expect(ms).toBe(2000)
  })

  it('an out-of-range key returns MISSING_CLIP_MS', () => {
    const ms = ctx.clipMs('bridge:9' as TourLineKey)
    expect(ms).toBe(MISSING_CLIP_MS)
  })
})

describe('dispatch queue', () => {
  it('a throwing runner does not leave stale events to replay on the next dispatch', () => {
    const run = vi.fn<(effects: TourEffect[]) => void>()
    useTourStore.getState().configure(tour, run)
    const { dispatch } = useTourStore.getState()
    // The first effects run queues a re-entrant END, then throws.
    run.mockImplementationOnce(() => {
      dispatch({ type: 'END' })
      throw new Error('runner failed')
    })
    expect(() => dispatch({ type: 'START' })).toThrow('runner failed')
    const phaseAfterFailure = useTourStore.getState().state.phase
    expect(phaseAfterFailure).toBe('intro')
    dispatch({ type: 'SET_AUTO', auto: true })
    // The stale END must not run; only the new event is reduced.
    expect(useTourStore.getState().state.phase).toBe(phaseAfterFailure)
    expect(useTourStore.getState().state.auto).toBe(true)
  })

  it('configure() clears queued events', () => {
    const run = vi.fn<(effects: TourEffect[]) => void>()
    useTourStore.getState().configure(tour, run)
    run.mockImplementationOnce(() => {
      useTourStore.getState().dispatch({ type: 'END' })
      useTourStore.getState().configure(tour, run)
    })
    useTourStore.getState().dispatch({ type: 'START' })
    expect(useTourStore.getState().state.phase).toBe('idle')
  })
})
