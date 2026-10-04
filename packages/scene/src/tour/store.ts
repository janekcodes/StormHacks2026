'use client'

import { estimateSpeechMs, type Tour, type TourLine } from '@museum/content/tour-schema'
import type { ExhibitId } from '@museum/content/schema'
import { create } from 'zustand'
import {
  CLIP_GRACE_MS,
  initialTourState,
  MISSING_CLIP_MS,
  reduceTour,
  type TourContext,
  type TourEffect,
  type TourEvent,
  type TourLineKey,
  type TourState
} from './machine'

export function lineFor(tour: Tour, key: TourLineKey): TourLine | undefined {
  if (key === 'intro' || key === 'outro' || key === 'fallback') return tour[key]
  const index = Number(key.split(':')[1])
  return tour.stops[index]?.bridge
}

export function tourContext(tour: Tour): TourContext {
  return {
    stops: tour.stops.map((stop) => stop.exhibitId as ExhibitId),
    clipMs: (key) => {
      const line = lineFor(tour, key)
      if (!line) return MISSING_CLIP_MS
      if (line.audio) return (line.durationMs ?? estimateSpeechMs(line.text)) + CLIP_GRACE_MS
      return estimateSpeechMs(line.text)
    }
  }
}

interface TourStore {
  tour: Tour | null
  state: TourState
  caption: string | null
  /** The guide's answer is still streaming (shown as "Thinking" until a sentence is spoken). */
  thinking: boolean
  configure: (tour: Tour | null, run: ((effects: TourEffect[]) => void) | null) => void
  dispatch: (event: TourEvent) => void
  setCaption: (text: string | null) => void
  setThinking: (on: boolean) => void
}

let runEffects: ((effects: TourEffect[]) => void) | null = null
let ctx: TourContext | null = null
const queue: TourEvent[] = []
let draining = false

export const useTourStore = create<TourStore>((set, get) => ({
  tour: null,
  state: initialTourState,
  caption: null,
  thinking: false,
  configure: (tour, run) => {
    runEffects = run
    ctx = tour ? tourContext(tour) : null
    queue.length = 0
    set({ tour, state: { ...initialTourState, auto: get().state.auto }, caption: null, thinking: false })
  },
  // Effects can dispatch synchronously (a failed walk); queue so each event
  // reduces against the state left by the one before it.
  dispatch: (event) => {
    queue.push(event)
    if (draining) return
    draining = true
    try {
      while (queue.length > 0) {
        const next = queue.shift()!
        if (!ctx) continue
        const out = reduceTour(get().state, next, ctx)
        set({ state: out.state })
        runEffects?.(out.effects)
      }
    } catch (error) {
      // Drop events queued behind the failure so they do not replay on the next dispatch.
      queue.length = 0
      throw error
    } finally {
      draining = false
    }
  },
  setCaption: (caption) => set({ caption }),
  setThinking: (thinking) => set({ thinking })
}))
