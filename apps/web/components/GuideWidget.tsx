'use client'

import type { Exhibit, ExhibitId } from '@museum/content/schema'
import {
  validateToolCall,
  type GuideMessage,
  type ToolCall,
  type ToolResponse,
  type VisitorContext
} from '@museum/guide/client'
import Link from 'next/link'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

const MAX_TURNS = 6

let sessionId = ''
function getSessionId(): string {
  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `guide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
  return sessionId
}

function builtIdSet(exhibits: readonly Exhibit[]): ReadonlySet<string> {
  return new Set(exhibits.filter((e) => e.tier === 'built').map((e) => e.id))
}

function chipLabel(call: ToolCall): string {
  switch (call.name) {
    case 'walkTo':
      return `Walking to ${String(call.args.exhibitId)}`
    case 'openPortal':
      return `Opening ${String(call.args.exhibitId)}`
    case 'highlight': {
      const ids = call.args.exhibitIds as string[] | undefined
      return ids && ids.length > 0 ? `Highlighting ${ids.join(', ')}` : 'Highlighting'
    }
    case 'startTour':
      return `Starting tour: ${String(call.args.title)}`
    case 'getVisitorContext':
      return 'Checking your location'
  }
}

/** In 2D, walkTo and openPortal resolve to links rather than scene travel. */
function chipHref(call: ToolCall): string | null {
  if (call.name === 'walkTo') return `/visit?exhibit=${String(call.args.exhibitId)}`
  if (call.name === 'openPortal') return `/exhibit/${String(call.args.exhibitId)}`
  return null
}

export function GuideWidget({
  exhibits,
  currentExhibitId = null
}: {
  exhibits: readonly Exhibit[]
  currentExhibitId?: ExhibitId | null
}) {
  const [open, setOpen] = useState(false)
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
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, streamText, chips])

  const visitorContext = (): VisitorContext => ({
    room: 'Website',
    roomKey: '2d',
    nearestExhibitId: currentExhibitId,
    openPortalId: null,
    visitedIds: []
  })

  const executeTool = (call: ToolCall): ToolResponse => {
    const validation = validateToolCall(call, { builtIds: builtIdSet(exhibits) })
    if (!validation.ok) {
      return { id: call.id, name: call.name, result: { ok: false, error: validation.error } }
    }
    return {
      id: call.id,
      name: validation.call.name,
      result: { ok: true, message: chipLabel(call) }
    }
  }

  const sendTurn = async (history: GuideMessage[]): Promise<GuideMessage[]> => {
    const res = await fetch('/api/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        messages: history,
        visitorContext: visitorContext()
      })
    })

    if (!res.ok || !res.body) {
      let message = 'Something went wrong. Please try again.'
      try {
        const data = (await res.json()) as { error?: string }
        if (data.error) message = data.error
      } catch {
        /* keep default */
      }
      throw new Error(message)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    const toolCalls: ToolCall[] = []

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
          const event = JSON.parse(line) as {
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
        } catch {
          /* ignore malformed line */
        }
      }
    }

    const next: GuideMessage[] = [
      ...history,
      { role: 'assistant', text, ...(toolCalls.length > 0 ? { toolCalls } : {}) }
    ]
    if (toolCalls.length > 0) {
      const toolResponses = toolCalls.map(executeTool)
      next.push({ role: 'tool', toolResponses })
    }
    return next
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || busyRef.current) return
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
        if (last?.role === 'assistant' && !(last.toolCalls && last.toolCalls.length > 0)) break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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
        <div key={index} className="g2d-row g2d-user">
          {message.text}
        </div>
      )
    }
    if (message.role === 'assistant') {
      if (!message.text && !(message.toolCalls && message.toolCalls.length > 0)) return null
      return (
        <div key={index} className="g2d-row g2d-assistant">
          {message.text ? <p>{message.text}</p> : null}
          {message.toolCalls && message.toolCalls.length > 0 ? (
            <div className="g2d-chips">
              {message.toolCalls.map((call, i) => {
                const href = chipHref(call)
                const label = chipLabel(call)
                return href ? (
                  <Link key={`${call.id || i}`} className="g2d-chip g2d-link" href={href}>
                    {label}
                  </Link>
                ) : (
                  <span key={`${call.id || i}`} className="g2d-chip">
                    {label}
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>
      )
    }
    return null
  }

  return (
    <div className="g2d-root">
      {open ? (
        <div className="g2d-panel" role="dialog" aria-label="AI guide" data-testid="guide-panel">
          <header className="g2d-head">
            <span className="g2d-badge">AI guide</span>
            <button
              type="button"
              className="g2d-close"
              aria-label="Close the guide"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="g2d-log" ref={logRef} data-testid="guide-log">
            {messages.length === 0 && !streamText ? (
              <p className="g2d-empty">Ask about any exhibit. I can point you to a portal or plan a tour.</p>
            ) : null}
            {messages.map(renderMessage)}
            {streamText ? (
              <div className="g2d-row g2d-assistant">
                <p>{streamText}</p>
              </div>
            ) : null}
            {chips.length > 0 ? (
              <div className="g2d-chips">
                {chips.map((call, i) => (
                  <span key={`${call.id || i}`} className="g2d-chip">
                    {chipLabel(call)}
                  </span>
                ))}
              </div>
            ) : null}
            {error ? <p className="g2d-error">{error}</p> : null}
          </div>
          <footer className="g2d-input">
            <textarea
              ref={inputRef}
              value={input}
              rows={2}
              placeholder="Ask the guide…"
              aria-label="Ask the guide"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            <button
              type="button"
              className="g2d-send"
              onClick={() => void handleSend()}
              disabled={busy || input.trim() === ''}
            >
              {busy ? '…' : 'Ask'}
            </button>
          </footer>
        </div>
      ) : (
        <button
          type="button"
          className="g2d-open"
          data-testid="guide-open"
          onClick={() => setOpen(true)}
        >
          Ask the guide
        </button>
      )}
      <style>{guideWidgetCss}</style>
    </div>
  )
}

const guideWidgetCss = `
.g2d-root { position: fixed; right: 18px; bottom: 18px; z-index: 40; }
.g2d-open {
  appearance: none; cursor: pointer; min-height: 44px; padding: 0 18px; border-radius: 999px;
  border: 1px solid #ffb347; background: #14181c; color: #ffb347;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 0.08em; text-transform: uppercase; box-shadow: 0 6px 22px rgba(0,0,0,.4);
}
.g2d-open:hover { background: #1d2329; }
.g2d-panel {
  width: min(400px, calc(100vw - 36px)); max-height: min(600px, calc(100vh - 120px));
  display: flex; flex-direction: column; border-radius: 14px; overflow: hidden;
  background: rgba(10,12,14,.96); border: 1px solid rgba(255,255,255,.14);
  color: #eef1f4; box-shadow: 0 12px 40px rgba(0,0,0,.5);
}
.g2d-head {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.g2d-badge {
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 13px;
  letter-spacing: 0.1em; text-transform: uppercase; color: #ffb347;
}
.g2d-close {
  margin-left: auto; appearance: none; cursor: pointer; border: 0; background: transparent;
  color: #aab2bb; font-size: 22px; line-height: 1; padding: 0 4px;
}
.g2d-close:hover { color: #ffb347; }
.g2d-log {
  flex: 1 1 auto; overflow-y: auto; padding: 12px; min-height: 140px;
  display: flex; flex-direction: column; gap: 10px;
}
.g2d-empty { margin: 0; font-size: 13px; line-height: 1.6; color: #8b939c; }
.g2d-row { max-width: 92%; padding: 9px 12px; border-radius: 10px; font-size: 13px; line-height: 1.55; }
.g2d-user { align-self: flex-end; background: #1d3a52; color: #eef1f4; white-space: pre-wrap; }
.g2d-assistant { align-self: flex-start; background: #161a1e; border: 1px solid rgba(255,255,255,.08); }
.g2d-assistant p { margin: 0; white-space: pre-wrap; }
.g2d-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 12px 4px; }
.g2d-chip {
  font-size: 11px; padding: 4px 9px; border-radius: 999px; text-decoration: none;
  border: 1px solid rgba(255,179,71,.5); color: #ffb347;
  font-family: "Chakra Petch", sans-serif; letter-spacing: 0.04em;
}
.g2d-link:hover { background: rgba(255,179,71,.12); }
.g2d-error { margin: 0; font-size: 12px; color: #ff8a80; padding: 0 2px; }
.g2d-input { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.1); align-items: flex-end; }
.g2d-input textarea {
  flex: 1 1 auto; resize: none; min-height: 38px; padding: 9px 10px;
  border-radius: 9px; border: 1px solid rgba(255,255,255,.16);
  background: #0e1114; color: #eef1f4; font: inherit; font-size: 13px; line-height: 1.4;
}
.g2d-input textarea:focus { outline: none; border-color: #ffb347; }
.g2d-send {
  appearance: none; cursor: pointer; min-height: 40px; padding: 0 16px; border-radius: 9px;
  border: 1px solid #ffb347; background: #ffb347; color: #14181c;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.g2d-send:disabled { opacity: .5; cursor: default; }
`
