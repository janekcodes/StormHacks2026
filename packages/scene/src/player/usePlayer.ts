'use client'

import { create } from 'zustand'
import type { QualityTier } from '../quality'

export interface PlayerState {
  x: number
  z: number
  yaw: number
  pitch: number
  quality: QualityTier
  keys: Record<string, boolean>
  showMap: boolean
  zoneKey: string
  zoneName: string
  ready: boolean
  setQuality: (q: QualityTier) => void
  setLook: (yaw: number, pitch: number) => void
  setKey: (key: string, down: boolean) => void
  clearKeys: () => void
  setPose: (x: number, z: number, yaw?: number, pitch?: number) => void
  setZone: (key: string, name: string) => void
  setReady: (ready: boolean) => void
  toggleMap: () => void
}

const START_X = 0
const START_Z = 20.7

export const usePlayer = create<PlayerState>((set) => ({
  x: START_X,
  z: START_Z,
  yaw: 0,
  pitch: -0.02,
  quality: 'balanced',
  keys: {},
  showMap: true,
  zoneKey: 'Foyer',
  zoneName: 'Foyer',
  ready: false,
  setQuality: (quality) => set({ quality }),
  setLook: (yaw, pitch) => set({ yaw, pitch }),
  setKey: (key, down) =>
    set((s) => ({ keys: down ? { ...s.keys, [key]: true } : { ...s.keys, [key]: false } })),
  clearKeys: () => set({ keys: {} }),
  setPose: (x, z, yaw, pitch) =>
    set((s) => ({
      x,
      z,
      yaw: yaw ?? s.yaw,
      pitch: pitch ?? s.pitch
    })),
  setZone: (zoneKey, zoneName) => set({ zoneKey, zoneName }),
  setReady: (ready) => set({ ready }),
  toggleMap: () => set((s) => ({ showMap: !s.showMap }))
}))

export const EYE_HEIGHT = 1.65
export const WALK_SPEED = 3.4
export const RUN_SPEED = 7
export const TURN_SPEED = 1.9
export const PITCH_LIMIT = 1.1
