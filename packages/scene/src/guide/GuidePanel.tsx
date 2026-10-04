'use client'

import type { Exhibit } from '@museum/content/schema'
import type { GuideMessage, ToolCall, ToolResponse } from '@museum/guide/client'
import { useEffect, useRef, useState } from 'react'
import { finish as finishSpeech, isSpeaking, pushText, stop as stopSpeech } from '../audio/guideVoiceBus'
import { GuideVoice } from '../audio/GuideVoice'
import { museum } from '../nav/api'
import { useFocusReturn, usePresence } from '../ui'
import { chipLabel, executeToolCall, visitorContext } from './executor'
import { GuideFrame } from './GuideFrame'
import { getSessionId } from './session'
import { useGuideStore } from './state'

const MAX_TURNS = 6

interface StreamError {
  status: number
  message: string
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? 'Something went wrong. Please try again.'
  } catch {
    return 'Something went wrong. Please try again.'
  }
}

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

  const sendTurn = async (history: GuideMessage[]): Promise<GuideMessage[]> => {
    const context = visitorContext(exhibits)
    const res = await fetch('/api/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getSessionId(), messages: history, visitorContext: context })
    })

    if (!res.ok) {
      const message = await readError(res)
      throw { status: res.status, message } as StreamError
    }
    if (!res.body) {
      throw { status: res.status, message: 'No response stream.' } as StreamError
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    const toolCalls: ToolCall[] = []

    const handleEvent = (raw: unknown) => {
      const event = raw as {
        type?: string
        text?: string
        id?: string
        name?: string
        args?: Record<string, unknown>
        thoughtSignature?: string
        error?: string
      }
      if (event.type === 'text' && typeof event.text === 'string') {
        text += event.text
        setStreamText(text)
        pushText(event.text)
      } else if (event.type === 'tool') {
        const call: ToolCall = {
          id: event.id ?? '',
          name: event.name as ToolCall['name'],
          args: event.args ?? {}
        }
        if (typeof event.thoughtSignature === 'string') call.thoughtSignature = event.thoughtSignature
        toolCalls.push(call)
        setChips((prev) => [...prev, call])
      } else if (event.type === 'error' && typeof event.error === 'string') {
        setError(event.error)
      }
    }

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        nl = buffer.indexOf('\n')
        if (!line) continue
        try {
          handleEvent(JSON.parse(line))
        } catch {
          // Ignore malformed lines and keep streaming.
        }
      }
    }

    const next: GuideMessage[] = [
      ...history,
      { role: 'assistant', text, ...(toolCalls.length > 0 ? { toolCalls } : {}) }
    ]
    if (toolCalls.length > 0) {
      const toolResponses: ToolResponse[] = toolCalls.map((call) => executeToolCall(call, exhibits))
      next.push({ role: 'tool', toolResponses })
    }
    return next
  }

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
        history = await sendTurn(history)
        setMessages(history)
        const last = history[history.length - 1]
        const doneAssistant = last?.role === 'assistant' && !(last.toolCalls && last.toolCalls.length > 0)
        if (doneAssistant) break
      }
      finishSpeech()
    } catch (err) {
      stopSpeech()
      const streamErr = err as StreamError
      setError(streamErr.message ?? 'Something went wrong. Please try again.')
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
