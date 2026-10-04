'use client'

import { createSentenceSplitter } from '@museum/guide/client'
import { getSessionId } from '../guide/session'
import { interruptNarration } from './narratorBus'

const SPEAK_KEY = 'museum.speak.v1'

type Listener = () => void

interface QueuedSentence {
  text: string
  status: 'loading' | 'ready' | 'failed'
  url: string | null
}

let enabled = readEnabled()
let queue: QueuedSentence[] = []
let audio: HTMLAudioElement | null = null
let speaking = false
let caption: string | null = null
let generation = 0
let narrationInterrupted = false
const splitter = createSentenceSplitter()
const listeners = new Set<Listener>()

function readEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(SPEAK_KEY) === '1'
  } catch {
    return false
  }
}

function emit(): void {
  for (const fn of listeners) fn()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isSpeakEnabled(): boolean {
  return enabled
}

export function setSpeakEnabled(value: boolean): void {
  enabled = value
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SPEAK_KEY, value ? '1' : '0')
  } catch {
    /* private mode or quota */
  }
  if (!value) stop()
  emit()
}

export function isSpeaking(): boolean {
  return speaking
}

export function getCaption(): string | null {
  return caption
}

/** Feed a chunk of streamed guide text. Queues any complete sentences. */
export function pushText(chunk: string): void {
  if (!enabled) return
  for (const sentence of splitter.push(chunk)) enqueue(sentence)
}

/** Flush any remaining buffered text when the answer stream ends. */
export function finish(): void {
  if (!enabled) return
  for (const sentence of splitter.flush()) enqueue(sentence)
}

/**
 * Stop all speech immediately and clear the queue. Called when the visitor
 * types, closes the panel or presses Stop, and at the start of a new answer.
 */
export function stop(): void {
  generation++
  splitter.reset()
  if (audio) {
    audio.pause()
    audio.onended = null
    audio.src = ''
  }
  for (const item of queue) {
    if (item.url) URL.revokeObjectURL(item.url)
  }
  queue = []
  speaking = false
  caption = null
  narrationInterrupted = false
  emit()
}

function enqueue(text: string): void {
  const trimmed = text.trim()
  if (!trimmed) return
  if (!narrationInterrupted) {
    interruptNarration()
    narrationInterrupted = true
  }
  const gen = generation
  const item: QueuedSentence = { text: trimmed, status: 'loading', url: null }
  queue.push(item)
  // Caption appears as soon as a sentence is ready to speak, so visitors (and
  // e2e) see it even while /api/speak is still fetching audio.
  if (queue.length === 1) {
    caption = trimmed
    speaking = true
    emit()
  }
  void loadSentence(item, gen)
}

async function loadSentence(item: QueuedSentence, gen: number): Promise<void> {
  let url: string | null = null
  try {
    url = await fetchAudioUrl(item.text)
  } catch {
    url = null
  }
  if (gen !== generation) {
    if (url) URL.revokeObjectURL(url)
    return
  }
  item.url = url
  item.status = url ? 'ready' : 'failed'
  if (item === queue[0]) playNext()
}

async function fetchAudioUrl(text: string): Promise<string> {
  const res = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: getSessionId(), text })
  })
  if (!res.ok) throw new Error(`speak failed: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

function playNext(): void {
  while (queue.length > 0 && queue[0]!.status === 'failed') queue.shift()
  const item = queue[0]
  if (!item) {
    if (audio) {
      audio.pause()
      audio.src = ''
    }
    speaking = false
    caption = null
    emit()
    return
  }
  if (item.status !== 'ready' || item.url === null) return

  if (!audio) audio = new Audio()
  audio.src = item.url
  caption = item.text
  speaking = true
  audio.onended = () => {
    const done = queue.shift()
    if (done?.url) URL.revokeObjectURL(done.url)
    playNext()
  }
  emit()
  void audio.play().catch(() => {
    /* autoplay blocked; the caption still shows and Stop remains available */
  })
}
