'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { ROWS, STATEMENTS, cardLine, rowsFor } from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('C3')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [stmt, setStmt] = useState(0)
  const chosen = STATEMENTS[stmt] ?? STATEMENTS[0]
  const line = cardLine({ label: chosen?.label ?? '', statement: chosen?.statement ?? '' })

  return (
    <section className="era" data-testid="portal-package" data-portal-id="C3" aria-label={copy.title}>
      <div className="row">
        <p className="label">Pick a statement to punch</p>
        <div className="controls">
          {STATEMENTS.map((item, index) => (
            <button
              key={item.button}
              type="button"
              className={index === stmt ? 'btn on mono' : 'btn mono'}
              aria-pressed={index === stmt}
              onClick={() => setStmt(index)}
            >
              {item.button}
            </button>
          ))}
        </div>
      </div>
      <div className="card" aria-label="Punched card">
        <div className="chars">
          {[...line].map((ch, index) => (
            <span key={index}>{ch === ' ' ? '' : ch}</span>
          ))}
        </div>
        <div className="holes">
          <div className="row-names">
            {ROWS.map((row) => (
              <span key={row}>{row}</span>
            ))}
          </div>
          {[...line].map((ch, index) => {
            const punched = new Set(rowsFor(ch))
            const shaded = index < 6 || index >= 72
            return (
              <div key={index} className={shaded ? 'col shade' : 'col'}>
                {ROWS.map((row) => (
                  <span key={row} className={punched.has(row) ? 'hole on' : 'hole'} />
                ))}
              </div>
            )
          })}
        </div>
        <div className="zones">
          <span>Label 1 to 5</span>
          <span>Statement 7 to 72</span>
          <span>ID 73 to 80</span>
        </div>
      </div>
      <div className="split">
        <p className="note">
          Each column holds one character, encoded as holes in the 12 rows (Hollerith code). Letters combine a zone punch (12, 11 or 0) with a digit. Drop the deck and you got to re-sort your program.
        </p>
        <pre>{`C     THE WHOLE DECK
      ISUM = 0
      DO 10 I = 1, 10
      ISUM = ISUM + I
   10 CONTINUE`}</pre>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #8DF7A9; --bg: #050a07; --muted: #c7e8d2; --line: #1f3a2a; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; display: flex; flex-direction: column; gap: 16px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #d7f5e0; }
.era .row, .era .controls, .era .split { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.era .split { align-items: flex-start; gap: 18px; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.mono { text-transform: none; letter-spacing: 0; font-family: "IBM Plex Mono", monospace; font-weight: 500; }
.era .btn.on { background: var(--ink); color: #08170e; }
.era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .card { overflow-x: auto; background: #efe3c2; color: #6b5a40; border-radius: 6px; padding: 10px 14px 12px; }
.era .chars, .era .holes { display: flex; gap: 2px; }
.era .chars { margin-left: 26px; margin-bottom: 4px; }
.era .chars span { width: 8px; font-size: 11px; text-align: center; color: #2a2520; font-weight: 600; }
.era .row-names { display: flex; flex-direction: column; gap: 2px; width: 22px; font-size: 11px; line-height: 12px; text-align: right; color: #2a2520; }
.era .col { display: flex; flex-direction: column; gap: 2px; }
.era .col.shade { background: rgba(107,90,64,.08); }
.era .hole { width: 8px; height: 12px; border-radius: 1px; }
.era .hole.on { background: #1a1a14; }
.era .zones { display: flex; justify-content: space-between; margin: 6px 0 0 26px; font-size: 12px; color: #2a2520; }
.era .note { flex: 1 1 300px; margin: 0; font-size: 13px; line-height: 1.6; color: var(--muted); }
.era pre { flex: 1 1 260px; margin: 0; padding: 12px; background: #000; border: 1px solid var(--line); border-radius: 6px; font-size: 12.5px; line-height: 1.5; color: var(--ink); white-space: pre; }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; } }
`
