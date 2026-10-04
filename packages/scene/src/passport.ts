'use client'

import type { ExhibitId } from '@museum/content/schema'
import { create } from 'zustand'

/** X2 is the open future slot and is not part of the 76. */
export const PASSPORT_TOTAL = 76
const STORAGE_KEY = 'museum.passport.v1'

function readOpened(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function writeOpened(ids: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* private mode or quota */
  }
}

export function passportCount(opened: readonly string[]): number {
  return new Set(opened.filter((id) => id !== 'X2')).size
}

interface PassportState {
  opened: string[]
  openId: ExhibitId | null
  markOpened: (id: ExhibitId) => void
  setOpen: (id: ExhibitId | null) => void
}

export const usePassport = create<PassportState>((set) => ({
  opened: readOpened(),
  openId: null,
  markOpened: (id) =>
    set((s) => {
      if (s.opened.includes(id)) return s
      const opened = [...s.opened, id]
      writeOpened(opened)
      return { opened }
    }),
  setOpen: (openId) => set({ openId })
}))
