'use client'

import type { Exhibit, ExhibitAudio, ExhibitId } from '@museum/content/schema'

const MUTE_KEY = 'museum.mute.v1'

type Listener = () => void

let activeAudio: HTMLAudioElement | null = null
let muted = readMuted()
const listeners = new Set<Listener>()
const endedListeners = new Set<() => void>()
const failedListeners = new Set<() => void>()
const audioByExhibit = new Map<ExhibitId, ExhibitAudio>()

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function notify(set: Set<() => void>): void {
  for (const fn of [...set]) fn()
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
  else notify(failedListeners)
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
  const el = activeAudio
  el.addEventListener('ended', () => {
    if (el !== activeAudio) return
    notify(endedListeners)
  })
  // A load or decode failure never fires 'ended'; report it so the tour moves on.
  el.addEventListener('error', () => {
    if (el === activeAudio) notify(failedListeners)
  })
  void el.play().catch((err: unknown) => {
    // Autoplay blocked (e.g. deep link): the play button remains available.
    if (err instanceof Error && err.name === 'NotAllowedError') return
    if (el === activeAudio) notify(failedListeners)
  })
  emit()
}

/** Called when the active narration clip plays to its end (tour auto-advance). */
export function onNarrationEnded(listener: () => void): () => void {
  endedListeners.add(listener)
  return () => {
    endedListeners.delete(listener)
  }
}

/** Called when the active narration cannot load or play (not for autoplay blocks). */
export function onNarrationFailed(listener: () => void): () => void {
  failedListeners.add(listener)
  return () => {
    failedListeners.delete(listener)
  }
}

/** Pause without rewinding, so the tour can resume where it stopped. */
export function pauseNarration(): void {
  activeAudio?.pause()
}

export function resumeNarration(): void {
  if (!activeAudio) return
  // Already finished: do not replay, let the tour move on.
  if (activeAudio.ended) {
    notify(endedListeners)
    return
  }
  void activeAudio.play().catch(() => {
    /* autoplay blocked; the tour's narration timeout keeps it moving */
  })
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
  // Already paused (e.g. the tour paused it in place): leave the position alone.
  if (!el || el.paused) return
  el.pause()
  el.currentTime = 0
}
