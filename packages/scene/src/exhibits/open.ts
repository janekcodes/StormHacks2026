'use client'

import type { Exhibit, ExhibitId } from '@museum/content/schema'
import { stop as stopGuideVoice } from '../audio/guideVoiceBus'
import { startNarrationFor, stopNarration } from '../audio/narratorBus'
import { museum } from '../nav/api'
import { exhibitStandPoint } from '../nav/targets'
import { usePlayer } from '../player/usePlayer'
import { usePassport } from '../passport'
import { useExhibitUi } from './ui'

/** Walk to the stand point, then open the portal on arrival. */
export function requestOpen(id: ExhibitId): boolean {
  if (usePassport.getState().openId) return false
  useExhibitUi.getState().setHover(null)
  const started = museum.walkTo(id, {
    onArrive: () => {
      usePlayer.getState().clearKeys()
      usePassport.getState().markOpened(id)
      usePassport.getState().setOpen(id)
    }
  })
  // Narration starts with the walk-to; the click is the gesture that unlocks audio.
  // Opening an exhibit stops guide speech so narration and speech never overlap.
  if (started) {
    stopGuideVoice()
    startNarrationFor(id)
  }
  return started
}

export function closePortal(): void {
  usePassport.getState().setOpen(null)
  usePlayer.getState().clearKeys()
  stopNarration()
}

/** Prev/next inside the open overlay. The scene is paused, so the pose snaps. */
export function showNeighbour(
  exhibits: readonly Exhibit[],
  currentId: ExhibitId,
  delta: number
): void {
  const current = exhibits.find((exhibit) => exhibit.id === currentId)
  if (!current) return
  const zone = exhibits.filter((exhibit) => exhibit.zone === current.zone)
  const index = zone.findIndex((exhibit) => exhibit.id === currentId)
  if (index < 0 || zone.length === 0) return
  const next = zone[(index + delta + zone.length) % zone.length]
  if (!next) return
  const stand = exhibitStandPoint(next.id)
  if (stand) usePlayer.getState().setPose(stand.x, stand.z, stand.yaw, -0.14)
  usePassport.getState().markOpened(next.id)
  usePassport.getState().setOpen(next.id)
  // The Prev/Next click is a user gesture, so the next exhibit's narration autoplays.
  stopGuideVoice()
  startNarrationFor(next.id)
}
