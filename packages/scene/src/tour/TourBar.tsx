'use client'

import type { Exhibit } from '@museum/content/schema'
import { useEffect, useRef, useState } from 'react'
import { finish as finishSpeech, isSpeaking, pushText, setSpeakOverride, subscribe as subscribeSpeech } from '../audio/guideVoiceBus'
import { isMuted } from '../audio/narratorBus'
import { askGuide } from '../guide/ask'
import { visitorContext } from '../guide/executor'
import { usePassport } from '../passport'
import { useVoiceInput } from '../voice/useVoiceInput'
import { answerQuestion } from './answer'
import { PLAY_MS } from './machine'
import { lineFor, useTourStore } from './store'

const COUNTDOWN_START = Math.ceil(PLAY_MS / 1000)

/** A hold longer than this is released automatically and whatever was heard is processed. */
const MAX_HOLD_MS = 30_000

/** Typing targets only; unlike the player controls, a focused dialog must not block tour keys. */
function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable ||
    target.closest('[role="menu"]') !== null
  )
}

export type TourBarVariant = 'floating' | 'inline'

/**
 * Exactly one body is mounted at a time, so only one owns the keyboard
 * listeners and the voice hook. While an exhibit is open the inline variant
 * (rendered inside the pop-up) owns them; otherwise the floating bar does.
 */
export function TourBar({ exhibits, variant = 'floating' }: { exhibits: readonly Exhibit[]; variant?: TourBarVariant }) {
  const exhibitOpen = usePassport((s) => s.openId !== null)
  if ((variant === 'inline') !== exhibitOpen) return null
  return <TourBarBody exhibits={exhibits} variant={variant} />
}

function TourBarBody({ exhibits, variant }: { exhibits: readonly Exhibit[]; variant: TourBarVariant }) {
  const tour = useTourStore((s) => s.tour)
  const state = useTourStore((s) => s.state)
  const caption = useTourStore((s) => s.caption)
  const dispatch = useTourStore((s) => s.dispatch)
  const voice = useVoiceInput()
  const [typed, setTyped] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_START)
  const holding = useRef(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearHoldTimer = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  const active = state.phase !== 'idle'
  const stopId = tour?.stops[state.index]?.exhibitId
  const stop = stopId ? exhibits.find((exhibit) => exhibit.id === stopId) : undefined
  const paused = state.pauseReason !== null
  const busy = state.pauseReason === 'listening' || state.pauseReason === 'answering'

  // voice.prefetch is the controller's stable method; depending on `voice`
  // (a new object each render) would refetch tokens on every render.
  const prefetch = voice.prefetch
  useEffect(() => {
    if (active) prefetch()
  }, [active, prefetch])

  // Display only: the machine's own timer drives the advance.
  const counting = state.phase === 'dwell' && state.pauseReason === null && state.auto
  useEffect(() => {
    if (!counting) return
    const startedAt = Date.now()
    setSecondsLeft(COUNTDOWN_START)
    const timer = setInterval(() => {
      const left = Math.ceil((PLAY_MS - (Date.now() - startedAt)) / 1000)
      setSecondsLeft(Math.min(COUNTDOWN_START, Math.max(1, left)))
    }, 250)
    return () => clearInterval(timer)
  }, [counting, state.phase, state.index, state.auto, state.pauseReason])

  const ask = (text: string) =>
    answerQuestion(text, {
      dispatch,
      ask: (question) =>
        askGuide(question, {
          exhibits,
          mode: 'tour',
          context: () => visitorContext(exhibits),
          onText: (chunk) => pushText(chunk)
        }),
      setSpeakOverride,
      finishSpeech,
      isSpeaking,
      subscribeSpeech,
      playFallback: async () => {
        const line = tour ? lineFor(tour, 'fallback') : undefined
        if (!line) return
        useTourStore.getState().setCaption(line.text)
        // Play the pre-generated line if it exists; never wait more than 4 s.
        const played: { audio: HTMLAudioElement | null } = { audio: null }
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          await new Promise<void>((resolve) => {
            timer = setTimeout(resolve, line.audio ? 4000 : 2500)
            if (!line.audio) return
            const audio = new Audio(line.audio.src)
            played.audio = audio
            audio.muted = isMuted()
            audio.onended = () => resolve()
            void audio.play().catch(() => undefined)
          })
        } finally {
          clearTimeout(timer)
          played.audio?.pause()
          useTourStore.getState().setCaption(null)
        }
      }
    })

  const releaseFailedHold = () => {
    if (!holding.current) return
    holding.current = false
    clearHoldTimer()
    dispatch({ type: 'RESUME' })
  }

  const pressTalk = async () => {
    if (holding.current || voice.status === 'unavailable') return
    if (useTourStore.getState().state.pauseReason === 'answering') return
    holding.current = true
    clearHoldTimer()
    holdTimer.current = setTimeout(() => void releaseTalkRef.current(), MAX_HOLD_MS)
    dispatch({ type: 'PAUSE', reason: 'listening' })
    await voice.start()
    // start() failing flips the status to unavailable and unmounts the mic
    // button, so no pointer or key release will ever arrive.
    if (voiceStatusRef.current === 'unavailable') releaseFailedHold()
  }

  const voiceStatusRef = useRef(voice.status)
  voiceStatusRef.current = voice.status
  useEffect(() => {
    if (voice.status === 'unavailable') releaseFailedHold()
  })

  const releaseTalk = async () => {
    if (!holding.current) return
    holding.current = false
    clearHoldTimer()
    const text = await voice.stop()
    if (!text) {
      dispatch({ type: 'RESUME' })
      return
    }
    await ask(text)
  }

  // Latest release handler, so the listeners below subscribe once instead of every render.
  const releaseTalkRef = useRef(releaseTalk)
  releaseTalkRef.current = releaseTalk
  useEffect(() => {
    // A held mic must not outlive the page's focus: no keyup/pointerup will arrive.
    const release = () => void releaseTalkRef.current()
    // The first mic permission prompt blurs the window while connecting; only a
    // live session ('listening') is released by blur or hiding.
    const releaseIfListening = () => {
      if (voiceStatusRef.current === 'listening') release()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') releaseIfListening()
    }
    window.addEventListener('blur', releaseIfListening)
    window.addEventListener('pointercancel', release)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', releaseIfListening)
      window.removeEventListener('pointercancel', release)
      document.removeEventListener('visibilitychange', onVisibility)
      clearHoldTimer()
      // Switching between the floating and inline bar unmounts the owner of a
      // live hold; no key or pointer release will arrive, so resume here. An
      // ask already in flight has holding=false and resumes itself.
      if (holding.current) {
        holding.current = false
        if (useTourStore.getState().state.pauseReason === 'listening') dispatch({ type: 'RESUME' })
      }
    }
  }, [dispatch])

  useEffect(() => {
    if (!active) return
    const onDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event) || event.repeat) return
      const key = event.key.toLowerCase()
      if (key === 'p') dispatch(paused && !busy ? { type: 'RESUME' } : { type: 'PAUSE', reason: 'user-pause' })
      else if (key === 'n') dispatch({ type: 'NEXT' })
      else if (key === 'b') dispatch({ type: 'PREV' })
      else if (key === 'v') void pressTalk()
      else return
      event.preventDefault()
    }
    const onUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'v') void releaseTalk()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  })

  if (!tour || !active) return null

  const label =
    state.phase === 'intro'
      ? 'Welcome'
      : state.phase === 'outro' || state.phase === 'done'
        ? 'Tour complete'
        : `Stop ${state.index + 1} of ${tour.stops.length}: ${stop?.id ?? ''} ${stop?.title ?? ''}`
  const liveCaption = state.pauseReason === 'listening' ? voice.partial || 'Listening' : caption
  const playing = state.phase === 'dwell' && state.pauseReason === null

  return (
    <div
      className={variant === 'inline' ? 'tour-bar tour-bar--inline' : 'museum-glass tour-bar'}
      role="region" aria-label="Guided tour" data-testid="tour-bar">
      <div className="tour-bar-status">
        <span className="tour-bar-stop" data-testid="tour-stop">
          {label}
        </span>
        {liveCaption ? (
          <span className="tour-bar-caption" data-testid="tour-caption" aria-live="polite">
            {liveCaption}
          </span>
        ) : null}
        {playing ? (
          <span className="tour-bar-note" data-testid="tour-countdown" aria-live="off">
            {state.auto ? `Next stop in ${secondsLeft}s` : 'Take your time, press Next when ready'}
          </span>
        ) : null}
        {state.pauseReason === 'user-move' || state.pauseReason === 'portal-closed' ? (
          <span className="tour-bar-note">Tour paused</span>
        ) : null}
      </div>
      <div className="tour-bar-actions">
        <button type="button" className="btn" aria-keyshortcuts="B" disabled={busy} onClick={() => dispatch({ type: 'PREV' })}>
          Prev
        </button>
        <button
          type="button"
          className="btn btn--outline-accent"
          aria-keyshortcuts="P"
          disabled={busy || state.phase === 'done'}
          onClick={() => dispatch(paused ? { type: 'RESUME' } : { type: 'PAUSE', reason: 'user-pause' })}
        >
          {state.pauseReason === 'user-move' || state.pauseReason === 'portal-closed'
            ? 'Resume tour'
            : paused
              ? 'Play'
              : 'Pause'}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          aria-keyshortcuts="N"
          disabled={busy || state.phase === 'done'}
          onClick={() => dispatch({ type: 'NEXT' })}
        >
          Skip to next exhibit
        </button>
        <button
          type="button"
          role="switch"
          className="btn"
          aria-checked={state.auto}
          onClick={() => dispatch({ type: 'SET_AUTO', auto: !state.auto })}
        >
          Auto
        </button>
        {voice.status === 'unavailable' ? (
          <form
            className="tour-bar-ask"
            onSubmit={(event) => {
              event.preventDefault()
              const text = typed.trim()
              if (!text || busy) return
              setTyped('')
              void ask(text)
            }}
          >
            <input
              aria-label="Ask the guide"
              value={typed}
              placeholder="Type a question"
              onChange={(event) => setTyped(event.target.value)}
            />
            <button type="submit" className="btn">
              Ask
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="btn tour-bar-mic"
            aria-keyshortcuts="V"
            aria-pressed={state.pauseReason === 'listening'}
            disabled={state.pauseReason === 'answering'}
            onPointerDown={() => void pressTalk()}
            onPointerUp={() => void releaseTalk()}
            onPointerLeave={() => void releaseTalk()}
            onKeyDown={(event) => {
              if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) void pressTalk()
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') void releaseTalk()
            }}
          >
            Hold to ask
          </button>
        )}
        <button type="button" className="btn" onClick={() => dispatch({ type: 'END' })}>
          End
        </button>
      </div>
    </div>
  )
}
