'use client'

import type { GuideMessage, ToolCall } from '@museum/guide/client'
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import type { PresenceState } from '../ui'

export interface GuideFrameProps {
  variant: 'scene' | 'page'
  state: PresenceState
  scope: string
  emptyText: string
  messages: readonly GuideMessage[]
  streamText: string
  pendingChips: readonly ToolCall[]
  error: string | null
  busy: boolean
  input: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  onInput: (value: string) => void
  onSend: () => void
  onClose: () => void
  renderChip: (call: ToolCall, key: string) => ReactNode
  /** Rendered between the log and the input (tour bar, voice controls). */
  extras?: ReactNode
}

/**
 * The guide dialog shell shared by the 3D panel and the 2D widget: header,
 * a polite live log, alert errors, and the input row. Escape closes it.
 */
export function GuideFrame({
  variant,
  state,
  scope,
  emptyText,
  messages,
  streamText,
  pendingChips,
  error,
  busy,
  input,
  inputRef,
  onInput,
  onSend,
  onClose,
  renderChip,
  extras
}: GuideFrameProps) {
  const titleId = useId()
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, streamText, pendingChips, error])

  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  const onInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  const renderMessage = (message: GuideMessage, index: number) => {
    if (message.role === 'user') {
      return (
        <div key={index} className="guide-row guide-user">
          <span className="visually-hidden">You: </span>
          {message.text}
        </div>
      )
    }
    if (message.role === 'assistant') {
      if (!message.text && !(message.toolCalls && message.toolCalls.length > 0)) return null
      return (
        <div key={index} className="guide-row guide-assistant">
          {message.text ? (
            <p>
              <span className="visually-hidden">Guide: </span>
              {message.text}
            </p>
          ) : null}
          {message.toolCalls && message.toolCalls.length > 0 ? (
            <div className="guide-chips">
              {message.toolCalls.map((call, i) => renderChip(call, `${call.id || i}`))}
            </div>
          ) : null}
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={`dialog guide-panel guide-panel--${variant}`}
      data-testid="guide-panel"
      data-state={state}
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={onPanelKey}
    >
      <header className="guide-head">
        <h2 id={titleId} className="guide-title">
          AI guide
        </h2>
        <span className="guide-scope">{scope}</span>
        <button
          type="button"
          className="btn btn--icon guide-close"
          aria-label="Close the guide"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div
        className="guide-log"
        ref={logRef}
        data-testid="guide-log"
        role="log"
        aria-live="polite"
        aria-busy={busy}
        aria-label="Conversation"
        tabIndex={0}
      >
        {messages.length === 0 && !streamText ? <p className="guide-empty">{emptyText}</p> : null}
        {messages.map(renderMessage)}
        {streamText ? (
          <div className="guide-row guide-assistant">
            <p>{streamText}</p>
          </div>
        ) : null}
        {pendingChips.length > 0 ? (
          <div className="guide-chips">
            {pendingChips.map((call, i) => renderChip(call, `pending-${call.id || i}`))}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="guide-error" role="alert">
          {error}
        </p>
      ) : null}

      {extras}

      <div className="guide-input">
        <textarea
          ref={inputRef}
          value={input}
          rows={2}
          placeholder="Ask about any exhibit"
          aria-label="Ask the guide"
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={onInputKey}
          disabled={busy}
        />
        <button
          type="button"
          className="btn btn--accent"
          onClick={onSend}
          disabled={busy || input.trim() === ''}
          aria-label={busy ? 'Ask (waiting for answer)' : 'Ask'}
        >
          {busy ? (
            <span className="loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </div>
    </div>
  )
}
