'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement
} from 'react'
import { loadCopy } from './copy'
import {
  NOTES,
  PARTNER_LINE,
  START_NOTE,
  jump,
  linkIndexes,
  noteById,
  partnerText,
  pushVisit,
  type Note
} from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('E3')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [currentId, setCurrentId] = useState<string>(START_NOTE)
  const [history, setHistory] = useState<string[]>([START_NOTE])
  const [partnerStep, setPartnerStep] = useState<number>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? PARTNER_LINE.length
      : 0
  )
  const linkRefs = useRef<Array<HTMLButtonElement | null>>([])

  const note = noteById(currentId) ?? (NOTES[0] as Note)
  const links = linkIndexes(note)
  const done = partnerStep >= PARTNER_LINE.length

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      setPartnerStep((step) => Math.min(step + 1, PARTNER_LINE.length))
    }, 110)
    return () => window.clearInterval(id)
  }, [done])

  const activate = (index: number): void => {
    const target = jump(currentId, index)
    if (!target) return
    setHistory((prev) => pushVisit(prev, target))
    setCurrentId(target)
  }

  const onNoteKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    if (links.length === 0) return
    event.preventDefault()
    const active = linkRefs.current.findIndex((el) => el === document.activeElement)
    const dir = event.key === 'ArrowRight' ? 1 : -1
    const next = ((active < 0 ? 0 : active) + dir + links.length) % links.length
    linkRefs.current[next]?.focus()
  }

  return (
    <section className="era" data-testid="portal-package" data-portal-id="E3" aria-label={copy.title}>
      <p className="hint">Move the pointer and click a link to jump between notes.</p>
      <div className="screen" aria-label="NLS terminal">
        <div className="crumbs" aria-label="Jump path">
          {history.map((id) => noteById(id)?.title ?? id).join(' > ')}
        </div>
        <h3 className="note-title">{note.title}</h3>
        <div className="note" role="group" aria-label={`Note: ${note.title}`} onKeyDown={onNoteKeyDown}>
          {note.tokens.map((token, index) => {
            if (token.link) {
              const linkPos = links.indexOf(index)
              return (
                <button
                  key={index}
                  type="button"
                  className="word link"
                  ref={(el) => {
                    linkRefs.current[linkPos] = el
                  }}
                  onClick={() => activate(index)}
                >
                  {token.text}
                </button>
              )
            }
            return (
              <span key={index} className="word">
                {token.text}
              </span>
            )
          })}
        </div>
        <div className="partner" aria-live="polite">
          <span className="partner-label">Menlo Park</span>
          <span className="partner-text">{partnerText(partnerStep)}</span>
          {!done ? (
            <span className="caret" aria-hidden="true">
              ▮
            </span>
          ) : null}
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #7ce38b; --bg: #050a07; --muted: #8fb79a; --line: #1f3a28; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "VT323", ui-monospace, monospace; display: flex; flex-direction: column; gap: 12px; }
.era .hint { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.era .screen { border: 1px solid var(--line); border-radius: 8px; padding: 18px 20px; background: #020503; box-shadow: inset 0 0 42px rgba(124, 227, 139, .08); display: flex; flex-direction: column; gap: 16px; }
.era .crumbs { font-family: "IBM Plex Mono", monospace; font-size: 12px; letter-spacing: .06em; color: var(--muted); }
.era .note-title { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 20px; color: #eafff0; }
.era .note { display: flex; flex-wrap: wrap; gap: 6px 9px; align-items: baseline; font-size: 24px; line-height: 1.35; color: #cfeeda; }
.era .word { white-space: nowrap; }
.era .word.link { appearance: none; cursor: pointer; border: none; background: none; padding: 0; font: inherit; color: var(--ink); text-decoration: underline; text-underline-offset: 4px; }
.era .word.link:hover { background: color-mix(in srgb, var(--ink) 16%, transparent); }
.era .word.link:focus-visible { outline: 2px solid #ffb347; outline-offset: 3px; border-radius: 3px; }
.era .partner { display: flex; align-items: baseline; gap: 10px; border-top: 1px dashed var(--line); padding-top: 12px; font-size: 20px; color: var(--muted); }
.era .partner-label { font-family: "Chakra Petch", sans-serif; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #ffb347; }
.era .partner-text { color: var(--ink); }
.era .caret { color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .era .caret { display: none; } }
`
