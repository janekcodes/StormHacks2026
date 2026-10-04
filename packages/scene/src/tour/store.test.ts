import { describe, expect, it, vi } from 'vitest'
import type { Tour } from '@museum/content/tour-schema'
import type { ExhibitId } from '@museum/content/schema'
import { CLIP_GRACE_MS, MISSING_CLIP_MS } from './machine'
import type { TourEffect, TourLineKey } from './machine'
import { beginAsk, tourContext, useTourStore } from './store'

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
      }
    },
    {
      exhibitId: 'B2' as ExhibitId,
      bridge: {
        text: 'Moving to the second stop',
        durationMs: 5000,
        audio: {
          src: 'audio.mp3',
          align: 'align.json',
          voiceId: 'voice123',
          modelId: 'model123',
          hash: 'hash123'
        }
      }
    },
    {
      exhibitId: 'C3' as ExhibitId,
      bridge: {
        text: 'Moving to the third stop',
        audio: {
          src: 'audio3.mp3',
          align: 'align3.json',
          voiceId: 'voice123',
          modelId: 'model123',
          hash: 'hash456'
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
    expect(ctx.clipMs('bridge:1')).toBe(5000 + CLIP_GRACE_MS)
  })

  it('a line with audio but no durationMs estimates the speech plus grace', () => {
    // 'Moving to the third stop' is 5 words: 5 * 400 = 2000
    expect(ctx.clipMs('bridge:2')).toBe(2000 + CLIP_GRACE_MS)
  })

  it('a caption-only line estimates from its text length', () => {
    expect(ctx.clipMs('intro')).toBe(1600)
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

describe('useTourStore thinking flag', () => {
  it('is set by setThinking and cleared when a tour is configured', () => {
    useTourStore.getState().setThinking(true)
    expect(useTourStore.getState().thinking).toBe(true)
    useTourStore.getState().configure(tour, null)
    expect(useTourStore.getState().thinking).toBe(false)
    useTourStore.getState().configure(null, null)
  })
})

describe('ask abort', () => {
  it('END aborts the in-flight ask; a finished ask is not aborted', () => {
    useTourStore.getState().configure(tour, () => undefined)
    useTourStore.getState().dispatch({ type: 'START' })
    const ask = beginAsk()
    expect(ask.signal.aborted).toBe(false)
    useTourStore.getState().dispatch({ type: 'END' })
    expect(ask.signal.aborted).toBe(true)
    const done = beginAsk()
    done.finish()
    useTourStore.getState().dispatch({ type: 'END' })
    expect(done.signal.aborted).toBe(false)
    useTourStore.getState().configure(null, null)
  })
})
