'use client'

import type { Exhibit, ExhibitAudio, ExhibitId } from '@museum/content/schema'

const MUTE_KEY = 'museum.mute.v1'

type Listener = () => void

let activeAudio: HTMLAudioElement | null = null
let muted = readMuted()
const listeners = new Set<Listener>()
const audioByExhibit = new Map<ExhibitId, ExhibitAudio>()

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function emit(): void {
  for (const fn of listeners) fn()
}

/** Subscribe to narration start/stop. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    /* private mode or quota */
  }
  if (activeAudio) activeAudio.muted = value
}

/** The currently playing narration element, or null when nothing plays. */
export function getActiveAudio(): HTMLAudioElement | null {
  return activeAudio
}

/** Register built exhibits so open/next can start narration by id. */
export function registerExhibitAudio(exhibits: readonly Exhibit[]): void {
  audioByExhibit.clear()
  for (const exhibit of exhibits) {
    if (exhibit.audio) audioByExhibit.set(exhibit.id, exhibit.audio)
  }
}

/** Start narration for an exhibit by id. No-op for unbuilt exhibits. */
export function startNarrationFor(id: ExhibitId): void {
  const audio = audioByExhibit.get(id)
  if (audio) startNarration(audio)
}

/**
 * Start narration audio. Called from the opening click so the user gesture
 * unlocks audio (BLUEPRINT section 12: narration starts with the walk-to).
 */
export function startNarration(audio: ExhibitAudio): void {
  stopNarration()
  activeAudio = new Audio(audio.src)
  activeAudio.muted = muted
  activeAudio.playbackRate = 1
  void activeAudio.play().catch(() => {
    /* autoplay blocked (e.g. deep link); the play button remains available */
  })
  emit()
}

/** Stop and release narration (close, prev/next, travel cancel). */
export function stopNarration(): void {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio = null
  }
  emit()
}

/**
 * Pause and rewind the currently playing narration. Called by guide speech
 * (plan 12) so narration and guide speech never overlap.
 */
export function interruptNarration(): void {
  const el = activeAudio
  if (!el) return
  el.pause()
  el.currentTime = 0
}
