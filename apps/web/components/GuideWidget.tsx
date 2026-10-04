'use client'

import type { Exhibit, ExhibitId } from '@museum/content/schema'
import {
  validateToolCall,
  type GuideMessage,
  type ToolCall,
  type ToolResponse,
  type VisitorContext
} from '@museum/guide/client'
import { GuideFrame, useFocusReturn, usePresence } from '@museum/scene/ui'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

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
  const presence = usePresence(open)
  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [input, setInput] = useState('')
  const [streamText, setStreamText] = useState('')
  const [chips, setChips] = useState<ToolCall[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef(false)

  useFocusReturn(open, () => launcherRef.current)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

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

  return (
    <div className="guide-dock theme-night">
      {presence ? (
        <GuideFrame
          variant="page"
          state={presence}
          scope="Answers from the collection"
          emptyText="Ask about any exhibit. I can point you to a portal or plan a tour."
          messages={messages}
          streamText={streamText}
          pendingChips={chips}
          error={error}
          busy={busy}
          input={input}
          inputRef={inputRef}
          onInput={setInput}
          onSend={() => void handleSend()}
          onClose={() => setOpen(false)}
          renderChip={(call, key) => {
            const href = chipHref(call)
            const label = chipLabel(call)
            return href ? (
              <Link key={key} className="chip" href={href}>
                {label}
              </Link>
            ) : (
              <span key={key} className="chip">
                {label}
              </span>
            )
          }}
        />
      ) : null}
      {open ? null : (
        <button
          ref={launcherRef}
          type="button"
          className="btn btn--glass guide-launcher"
          data-testid="guide-open"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className="guide-launcher-dot" aria-hidden="true" />
          Ask the guide
        </button>
      )}
    </div>
  )
}
