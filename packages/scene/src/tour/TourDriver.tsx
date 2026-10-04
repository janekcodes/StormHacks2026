'use client'

import type { Tour } from '@museum/content/tour-schema'
import { useEffect } from 'react'
import { stop as stopGuideVoice } from '../audio/guideVoiceBus'
import {
  isMuted,
  onNarrationEnded,
  pauseNarration,
  resumeNarration,
  startNarrationFor,
  stopNarration
} from '../audio/narratorBus'
import { museum } from '../nav/api'
import { exhibitStandPoint } from '../nav/targets'
import { usePassport } from '../passport'
import { usePlayer } from '../player/usePlayer'
import { createClipPlayer } from './clips'
import { createTourRunner } from './runner'
import { lineFor, useTourStore } from './store'

/** Connects the tour store to the scene. Mount once, outside the Canvas. */
export function TourDriver({ tour }: { tour: Tour }) {
  useEffect(() => {
    const store = useTourStore.getState()
    const dispatch = store.dispatch
    const clips = createClipPlayer({
      resolve: (key) => lineFor(tour, key),
      onEnded: () => dispatch({ type: 'CLIP_ENDED' }),
      onCaption: (text) => useTourStore.getState().setCaption(text),
      isMuted
    })
    const runner = createTourRunner({
      dispatch,
      clips,
      walkTo: (id, opts) => museum.walkTo(id, opts),
      cancelTravel: () => museum.cancelTravel(),
      snapTo: (id) => {
        const stand = exhibitStandPoint(id)
        if (stand) usePlayer.getState().setPose(stand.x, stand.z, stand.yaw, -0.14)
      },
      openPortal: (id) => {
        usePlayer.getState().clearKeys()
        usePassport.getState().markOpened(id)
        usePassport.getState().setOpen(id)
      },
      closePortal: () => {
        usePassport.getState().setOpen(null)
        usePlayer.getState().clearKeys()
        stopNarration()
      },
      subscribePortal: (fn) =>
        usePassport.subscribe((state, prev) => {
          if (state.openId !== prev.openId) fn(state.openId, prev.openId)
        }),
      // Same as clicking the exhibit: guide speech stops, then the exhibit's own narration plays.
      startNarration: (id) => {
        stopGuideVoice()
        startNarrationFor(id)
      },
      pauseNarration,
      resumeNarration,
      onNarrationEnded,
      setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimeout: (handle) => globalThis.clearTimeout(handle)
    })
    store.configure(tour, (effects) => runner.run(effects))
    return () => {
      runner.dispose()
      useTourStore.getState().configure(null, null)
    }
  }, [tour])

  return null
}
