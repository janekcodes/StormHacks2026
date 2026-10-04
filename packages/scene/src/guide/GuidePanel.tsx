'use client'

import type { Exhibit } from '@museum/content/schema'
import type { GuideMessage, ToolCall } from '@museum/guide/client'
import { useEffect, useRef, useState } from 'react'
import { finish as finishSpeech, isSpeaking, pushText, stop as stopSpeech } from '../audio/guideVoiceBus'
import { GuideVoice } from '../audio/GuideVoice'
import { museum } from '../nav/api'
import { useFocusReturn, usePresence } from '../ui'
import { GuideRequestError, MAX_TURNS, streamGuideTurn } from './ask'
import { chipLabel, visitorContext } from './executor'
import { GuideFrame } from './GuideFrame'
import { useGuideStore } from './state'

export function GuidePanel({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const open = useGuideStore((s) => s.open)
  const seed = useGuideStore((s) => s.seed)
  const setOpen = useGuideStore((s) => s.setOpen)
  const tour = useGuideStore((s) => s.tour)
  const advanceTour = useGuideStore((s) => s.advanceTour)
  const endTour = useGuideStore((s) => s.endTour)
  const presence = usePresence(open)

  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [input, setInput] = useState('')
  const [streamText, setStreamText] = useState('')
  const [chips, setChips] = useState<ToolCall[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busyRef = useRef(false)

  useFocusReturn(open, () => document.querySelector<HTMLElement>('[data-testid="guide-open"]'))

  useEffect(() => {
    if (open) {
      if (seed) setInput(seed)
      inputRef.current?.focus()
    }
  }, [open, seed])

  useEffect(() => {
    if (!open) stopSpeech()
  }, [open])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || busyRef.current) return
    stopSpeech()
    setInput('')
    setError(null)
    setStreamText('')
    setChips([])
    setBusy(true)
    busyRef.current = true

    let history: GuideMessage[] = [...messages, { role: 'user', text }]
    setMessages(history)

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        history = await streamGuideTurn(history, {
          exhibits,
          mode: 'visit',
          context: () => visitorContext(exhibits),
          onText: (chunk, full) => {
            setStreamText(full)
            pushText(chunk)
          },
          onTool: (call) => setChips((prev) => [...prev, call]),
          onStreamError: (message) => setError(message)
        })
        setMessages(history)
        const last = history[history.length - 1]
        const doneAssistant = last?.role === 'assistant' && !(last.toolCalls && last.toolCalls.length > 0)
        if (doneAssistant) break
      }
      finishSpeech()
    } catch (err) {
      stopSpeech()
      setError(err instanceof GuideRequestError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      busyRef.current = false
      setStreamText('')
      setChips([])
    }
  }

  if (!presence) return null

  const tourBar = tour ? (
    <div className="guide-tour" data-testid="guide-tour">
      <span className="guide-tour-title">{tour.title}</span>
      <span className="guide-tour-stop">
        Stop {tour.index + 1} of {tour.stops.length}: {tour.stops[tour.index]}
      </span>
      <div className="guide-tour-actions">
        {tour.index < tour.stops.length - 1 ? (
          <button
            type="button"
            className="btn btn--outline-accent"
            onClick={() => {
              const next = tour.index + 1
              advanceTour(next)
              const id = tour.stops[next]
              if (id) museum.walkTo(id)
            }}
          >
            Next stop
          </button>
        ) : null}
        <button type="button" className="btn" onClick={endTour}>
          End tour
        </button>
      </div>
    </div>
  ) : null

  return (
    <GuideFrame
      variant="scene"
      state={presence}
      scope="Answers from the collection"
      emptyText="Ask about any exhibit. I can walk you there, open a portal, or plan a tour."
      messages={messages}
      streamText={streamText}
      pendingChips={chips}
      error={error}
      busy={busy}
      input={input}
      inputRef={inputRef}
      onInput={(value) => {
        setInput(value)
        if (isSpeaking()) stopSpeech()
      }}
      onSend={() => void handleSend()}
      onClose={() => setOpen(false)}
      renderChip={(call, key) => (
        <span key={key} className="chip">
          {chipLabel(call)}
        </span>
      )}
      extras={
        <>
          {tourBar}
          <GuideVoice />
        </>
      }
    />
  )
}
