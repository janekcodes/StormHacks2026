'use client'

import type { TourLine } from '@museum/content/tour-schema'
import type { TourLineKey } from './machine'

export interface ClipPlayer {
  play: (key: TourLineKey) => void
  pause: () => void
  resume: () => void
  stop: () => void
  caption: () => string | null
}

export interface ClipPlayerDeps {
  resolve: (key: TourLineKey) => TourLine | undefined
  onEnded: () => void
  onCaption: (text: string | null) => void
  isMuted: () => boolean
  createAudio?: (src: string) => HTMLAudioElement
}

/**
 * Tour lines (intro, bridges, outro, fallback) play on their own element so
 * travel cancels, which stop exhibit narration, never cut a bridge line.
 * A line without generated audio shows its caption only; the machine's clip
 * timeout moves the tour on.
 */
export function createClipPlayer(deps: ClipPlayerDeps): ClipPlayer {
  const make = deps.createAudio ?? ((src: string) => new Audio(src))
  let el: HTMLAudioElement | null = null
  let text: string | null = null

  const stop = () => {
    if (el) {
      el.onended = null
      el.onerror = null
      el.pause()
      el = null
    }
    text = null
    deps.onCaption(null)
  }

  return {
    play(key) {
      stop()
      const line = deps.resolve(key)
      if (!line) return
      text = line.text
      deps.onCaption(text)
      if (!line.audio) return
      const audio = make(line.audio.src)
      audio.muted = deps.isMuted()
      audio.onended = () => {
        if (el !== audio) return
        deps.onEnded()
      }
      audio.onerror = () => {
        if (el === audio) deps.onEnded()
      }
      el = audio
      void audio.play().catch(() => {
        /* autoplay blocked; the clip timeout advances the tour */
      })
    },
    pause() {
      el?.pause()
    },
    resume() {
      if (el) void el.play().catch(() => undefined)
    },
    stop,
    caption: () => text
  }
}
