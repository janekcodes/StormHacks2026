'use client'

import type { Exhibit } from '@museum/content/schema'
import type { GuideMessage, ToolCall, ToolResponse } from '@museum/guide/client'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { finish as finishSpeech, isSpeaking, pushText, stop as stopSpeech } from '../audio/guideVoiceBus'
import { GuideVoice } from '../audio/GuideVoice'
import { museum } from '../nav/api'
import { chipLabel, executeToolCall, visitorContext } from './executor'
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

  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [input, setInput] = useState('')
  const [streamText, setStreamText] = useState('')
  const [chips, setChips] = useState<ToolCall[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    if (open) {
      if (seed) setInput(seed)
      inputRef.current?.focus()
    }
  }, [open, seed])

  useEffect(() => {
    if (!open) stopSpeech()
  }, [open])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, streamText, chips, tour])

  const sendTurn = async (history: GuideMessage[]): Promise<GuideMessage[]> => {
    const context = visitorContext(exhibits)
    const res = await fetch('/api/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getSessionId(), messages: history, visitorContext: context })
    })

    if (!res.ok) {
      const message = await readError(res)
      if (res.status === 429) {
        throw { status: 429, message } as StreamError
      }
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

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const renderMessage = (message: GuideMessage, index: number) => {
    if (message.role === 'user') {
      return (
        <div key={index} className="guide-row guide-user">
          {message.text}
        </div>
      )
    }
    if (message.role === 'assistant') {
      if (!message.text && !(message.toolCalls && message.toolCalls.length > 0)) return null
      return (
        <div key={index} className="guide-row guide-assistant">
          {message.text ? <p>{message.text}</p> : null}
          {message.toolCalls && message.toolCalls.length > 0 ? (
            <div className="guide-chips">
              {message.toolCalls.map((call, i) => (
                <span key={`${call.id || i}`} className="guide-chip">
                  {chipLabel(call)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )
    }
    return null
  }

  if (!open) return null

  return (
    <div className="guide-panel" data-testid="guide-panel" role="dialog" aria-label="AI guide">
      <header className="guide-head">
        <span className="guide-badge">AI guide</span>
        <span className="guide-scope">answers from the collection</span>
        <button
          type="button"
          className="guide-close"
          aria-label="Close the guide"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </header>

      <div className="guide-log" ref={logRef} data-testid="guide-log">
        {messages.length === 0 && !streamText ? (
          <p className="guide-empty">
            Ask about any exhibit. I can walk you there, open a portal, or plan a tour.
          </p>
        ) : null}
        {messages.map(renderMessage)}
        {streamText ? (
          <div className="guide-row guide-assistant">
            <p>{streamText}</p>
          </div>
        ) : null}
        {chips.length > 0 ? (
          <div className="guide-chips">
            {chips.map((call, i) => (
              <span key={`${call.id || i}`} className="guide-chip">
                {chipLabel(call)}
              </span>
            ))}
          </div>
        ) : null}
        {error ? <p className="guide-error">{error}</p> : null}
      </div>

      {tour ? (
        <div className="guide-tour" data-testid="guide-tour">
          <span className="guide-tour-title">{tour.title}</span>
          <span className="guide-tour-stop">
            Stop {tour.index + 1} of {tour.stops.length}: {tour.stops[tour.index]}
          </span>
          <div className="guide-tour-actions">
            {tour.index < tour.stops.length - 1 ? (
              <button
                type="button"
                className="guide-btn"
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
            <button type="button" className="guide-btn" onClick={endTour}>
              End tour
            </button>
          </div>
        </div>
      ) : null}

      <GuideVoice />

      <footer className="guide-input">
        <textarea
          ref={inputRef}
          value={input}
          rows={2}
          placeholder="Ask the guide…"
          aria-label="Ask the guide"
          onChange={(event) => {
            setInput(event.target.value)
            if (isSpeaking()) stopSpeech()
          }}
          onKeyDown={onKeyDown}
          disabled={busy}
        />
        <button
          type="button"
          className="guide-send"
          onClick={() => void handleSend()}
          disabled={busy || input.trim() === ''}
        >
          {busy ? '…' : 'Ask'}
        </button>
      </footer>

      <style>{guideCss}</style>
    </div>
  )
}

const guideCss = `
.guide-panel {
  position: absolute; right: 14px; bottom: 96px; z-index: 7;
  width: min(380px, calc(100vw - 28px));
  max-height: min(560px, calc(100% - 160px));
  display: flex; flex-direction: column;
  background: rgba(10,12,14,.92); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.14); border-radius: 14px;
  color: #eef1f4; box-shadow: 0 12px 40px rgba(0,0,0,.5);
  overflow: hidden;
}
.guide-head {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.guide-badge {
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 0.1em; text-transform: uppercase; color: #ffb347;
}
.guide-scope { font-size: 11px; color: #8b939c; }
.guide-close {
  margin-left: auto; appearance: none; cursor: pointer; border: 0; background: transparent;
  color: #aab2bb; font-size: 22px; line-height: 1; padding: 0 4px;
}
.guide-close:hover { color: #ffb347; }
.guide-log {
  flex: 1 1 auto; overflow-y: auto; padding: 12px;
  display: flex; flex-direction: column; gap: 10px; min-height: 120px;
}
.guide-empty { margin: 0; font-size: 13px; line-height: 1.6; color: #8b939c; }
.guide-row { max-width: 92%; padding: 9px 12px; border-radius: 10px; font-size: 13px; line-height: 1.55; }
.guide-user { align-self: flex-end; background: #1d3a52; color: #eef1f4; white-space: pre-wrap; }
.guide-assistant { align-self: flex-start; background: #161a1e; border: 1px solid rgba(255,255,255,.08); }
.guide-assistant p { margin: 0; white-space: pre-wrap; }
.guide-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 12px 4px; }
.guide-chip {
  font-size: 11px; padding: 4px 9px; border-radius: 999px;
  border: 1px solid rgba(255,179,71,.5); color: #ffb347;
  font-family: "Chakra Petch", sans-serif; letter-spacing: 0.04em;
}
.guide-error { margin: 0; font-size: 12px; color: #ff8a80; padding: 0 2px; }
.guide-tour {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  padding: 8px 12px; border-top: 1px solid rgba(255,255,255,.1);
  background: rgba(255,179,71,.06);
}
.guide-tour-title { font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; color: #ffb347; }
.guide-tour-stop { font-size: 12px; color: #c3c9d0; }
.guide-tour-actions { margin-left: auto; display: flex; gap: 6px; }
.guide-btn {
  appearance: none; cursor: pointer; min-height: 28px; padding: 0 10px; border-radius: 7px;
  border: 1px solid rgba(255,179,71,.5); background: transparent; color: #ffb347;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.guide-btn:hover { background: rgba(255,179,71,.12); }
.guide-input {
  display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.1);
  align-items: flex-end;
}
.guide-input textarea {
  flex: 1 1 auto; resize: none; min-height: 38px; padding: 9px 10px;
  border-radius: 9px; border: 1px solid rgba(255,255,255,.16);
  background: #0e1114; color: #eef1f4; font: inherit; font-size: 13px; line-height: 1.4;
}
.guide-input textarea:focus { outline: none; border-color: #ffb347; }
.guide-send {
  appearance: none; cursor: pointer; min-height: 40px; padding: 0 16px; border-radius: 9px;
  border: 1px solid #ffb347; background: #ffb347; color: #14181c;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.guide-send:disabled { opacity: .5; cursor: default; }
`
