'use client'

import type { Exhibit } from '@museum/content/schema'
import { useEffect, useRef, useState } from 'react'
import { finish as finishSpeech, isSpeaking, pushText, setSpeakOverride, subscribe as subscribeSpeech } from '../audio/guideVoiceBus'
import { isMuted } from '../audio/narratorBus'
import { askGuide } from '../guide/ask'
import { visitorContext } from '../guide/executor'
import { isUiTarget } from '../player/Controls'
import { useVoiceInput } from '../voice/useVoiceInput'
import { answerQuestion } from './answer'
import { PLAY_MS } from './machine'
import { lineFor, useTourStore } from './store'

const COUNTDOWN_START = Math.ceil(PLAY_MS / 1000)

export function TourBar({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const tour = useTourStore((s) => s.tour)
  const state = useTourStore((s) => s.state)
  const caption = useTourStore((s) => s.caption)
  const dispatch = useTourStore((s) => s.dispatch)
  const voice = useVoiceInput()
  const [typed, setTyped] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_START)
  const holding = useRef(false)

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
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, line.audio ? 4000 : 2500)
          if (!line.audio) return
          const audio = new Audio(line.audio.src)
          audio.muted = isMuted()
          audio.onended = () => {
            clearTimeout(timer)
            resolve()
          }
          void audio.play().catch(() => undefined)
        })
        useTourStore.getState().setCaption(null)
      }
    })

  const pressTalk = async () => {
    if (holding.current || voice.status === 'unavailable') return
    holding.current = true
    dispatch({ type: 'PAUSE', reason: 'listening' })
    await voice.start()
  }

  const releaseTalk = async () => {
    if (!holding.current) return
    holding.current = false
    const text = await voice.stop()
    if (!text) {
      dispatch({ type: 'RESUME' })
      return
    }
    await ask(text)
  }

  useEffect(() => {
    if (!active) return
    const onDown = (event: KeyboardEvent) => {
      if (isUiTarget(event) || event.repeat) return
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
    <div className="museum-glass tour-bar" role="region" aria-label="Guided tour" data-testid="tour-bar">
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
