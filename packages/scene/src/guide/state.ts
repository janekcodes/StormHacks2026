'use client'

import type { ExhibitId } from '@museum/content/schema'
import { create } from 'zustand'

export interface GuideTour {
  title: string
  stops: ExhibitId[]
  index: number
}

interface GuideState {
  open: boolean
  /** Pre-filled prompt for the next time the panel opens (portal "Ask the guide"). */
  seed: string | null
  highlightIds: ExhibitId[]
  tour: GuideTour | null
  setOpen: (open: boolean) => void
  openSeeded: (seed?: string) => void
  setHighlight: (ids: ExhibitId[]) => void
  clearHighlight: () => void
  startTour: (title: string, stops: ExhibitId[]) => void
  advanceTour: (index: number) => void
  endTour: () => void
}

export const useGuideStore = create<GuideState>((set) => ({
  open: false,
  seed: null,
  highlightIds: [],
  tour: null,
  setOpen: (open) => set({ open }),
  openSeeded: (seed) => set({ open: true, seed: seed ?? null }),
  setHighlight: (highlightIds) => set({ highlightIds }),
  clearHighlight: () => set({ highlightIds: [] }),
  startTour: (title, stops) => set({ tour: { title, stops, index: 0 } }),
  advanceTour: (index) =>
    set((s) => (s.tour ? { tour: { ...s.tour, index } } : s)),
  endTour: () => set({ tour: null })
}))
