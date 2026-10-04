'use client'

import type { ExhibitId } from '@museum/content/schema'
import { create } from 'zustand'

interface ExhibitUiState {
  focusId: ExhibitId | null
  hoverId: ExhibitId | null
  setFocus: (id: ExhibitId | null) => void
  setHover: (id: ExhibitId | null) => void
}

export const useExhibitUi = create<ExhibitUiState>((set) => ({
  focusId: null,
  hoverId: null,
  setFocus: (focusId) => set((s) => (s.focusId === focusId ? s : { focusId })),
  setHover: (hoverId) => set((s) => (s.hoverId === hoverId ? s : { hoverId }))
}))
