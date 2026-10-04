'use client'

import type { ExhibitId } from '@museum/content/schema'
import type { ClipPlayer } from './clips'
import type { TimerKind, TourEffect, TourEvent } from './machine'

type Handle = ReturnType<typeof globalThis.setTimeout>

export interface RunnerDeps {
  dispatch: (event: TourEvent) => void
  clips: ClipPlayer
  walkTo: (id: ExhibitId, opts: { onArrive: () => void; onCancel: () => void }) => boolean
  cancelTravel: () => void
  snapTo: (id: ExhibitId) => void
  openPortal: (id: ExhibitId) => void
  closePortal: () => void
  /** Called with (openId, previousOpenId) whenever the open portal changes. */
  subscribePortal: (fn: (id: ExhibitId | null, prev: ExhibitId | null) => void) => () => void
  startNarration: (id: ExhibitId) => void
  pauseNarration: () => void
  resumeNarration: () => void
  onNarrationEnded: (fn: () => void) => () => void
  setTimeout: (fn: () => void, ms: number) => Handle
  clearTimeout: (handle: Handle) => void
}

/**
 * Executes machine effects against the scene. Tokens make sure callbacks from
 * an earlier walk, or portal changes the tour made itself, never become events.
 */
export function createTourRunner(deps: RunnerDeps) {
  let walkToken = 0
  let tourPortalChange = false
  const timers = new Map<TimerKind, Handle>()

  const offPortal = deps.subscribePortal((id, prev) => {
    if (tourPortalChange) return
    if (prev !== null && id !== prev) deps.dispatch({ type: 'PORTAL_CLOSED' })
  })
  const offEnded = deps.onNarrationEnded(() => deps.dispatch({ type: 'NARRATION_ENDED' }))

  const clearTimer = (kind: TimerKind) => {
    const handle = timers.get(kind)
    if (handle !== undefined) deps.clearTimeout(handle)
    timers.delete(kind)
  }

  const asTour = (fn: () => void) => {
    tourPortalChange = true
    try {
      fn()
    } finally {
      tourPortalChange = false
    }
  }

  const runOne = (effect: TourEffect) => {
    switch (effect.type) {
      case 'playClip':
        return deps.clips.play(effect.key)
      case 'pauseClip':
        return deps.clips.pause()
      case 'resumeClip':
        return deps.clips.resume()
      case 'stopClip':
        return deps.clips.stop()
      case 'walk': {
        const token = ++walkToken
        const ok = deps.walkTo(effect.id, {
          onArrive: () => {
            if (token === walkToken) deps.dispatch({ type: 'WALK_ARRIVED' })
          },
          onCancel: () => {
            if (token === walkToken) deps.dispatch({ type: 'WALK_CANCELLED' })
          }
        })
        if (!ok) deps.dispatch({ type: 'TIMEOUT', kind: 'walk' })
        return
      }
      case 'cancelWalk':
        walkToken++
        return deps.cancelTravel()
      case 'snapTo':
        walkToken++
        deps.cancelTravel()
        return deps.snapTo(effect.id)
      case 'openPortal':
        return asTour(() => deps.openPortal(effect.id))
      case 'closePortal':
        return asTour(() => deps.closePortal())
      case 'startNarration':
        return deps.startNarration(effect.id)
      case 'pauseNarration':
        return deps.pauseNarration()
      case 'resumeNarration':
        return deps.resumeNarration()
      case 'startTimer': {
        clearTimer(effect.kind)
        const kind = effect.kind
        timers.set(
          kind,
          deps.setTimeout(() => {
            timers.delete(kind)
            deps.dispatch({ type: 'TIMEOUT', kind })
          }, effect.ms)
        )
        return
      }
      case 'clearTimer':
        return clearTimer(effect.kind)
      case 'clearTimers':
        for (const kind of [...timers.keys()]) clearTimer(kind)
        return
    }
  }

  return {
    run(effects: TourEffect[]) {
      for (const effect of effects) runOne(effect)
    },
    dispose() {
      for (const kind of [...timers.keys()]) clearTimer(kind)
      walkToken++
      offPortal()
      offEnded()
      deps.clips.stop()
    }
  }
}
