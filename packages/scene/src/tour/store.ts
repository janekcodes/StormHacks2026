'use client'

import type { Tour, TourLine } from '@museum/content/tour-schema'
import type { ExhibitId } from '@museum/content/schema'
import { create } from 'zustand'
import {
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
  const index = Number(key.slice('bridge:'.length))
  return tour.stops[index]?.bridge
}

export function tourContext(tour: Tour): TourContext {
  return {
    stops: tour.stops.map((stop) => stop.exhibitId as ExhibitId),
    clipMs: (key) => {
      const line = lineFor(tour, key)
      return line?.audio && line.durationMs ? line.durationMs : MISSING_CLIP_MS
    }
  }
}

interface TourStore {
  tour: Tour | null
  state: TourState
  caption: string | null
  configure: (tour: Tour | null, run: ((effects: TourEffect[]) => void) | null) => void
  dispatch: (event: TourEvent) => void
  setCaption: (text: string | null) => void
}

let runEffects: ((effects: TourEffect[]) => void) | null = null
let ctx: TourContext | null = null
const queue: TourEvent[] = []
let draining = false

export const useTourStore = create<TourStore>((set, get) => ({
  tour: null,
  state: initialTourState,
  caption: null,
  configure: (tour, run) => {
    runEffects = run
    ctx = tour ? tourContext(tour) : null
    set({ tour, state: { ...initialTourState, auto: get().state.auto }, caption: null })
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
    } finally {
      draining = false
    }
  },
  setCaption: (caption) => set({ caption })
}))
