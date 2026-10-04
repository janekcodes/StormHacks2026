'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { JS_SQUARES, litSquares, waffleLabel, waffleNote, type WaffleMode } from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('C10')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [mode, setMode] = useState<WaffleMode>('js')
  const lit = litSquares(mode)

  return (
    <section className="era" data-testid="portal-package" data-portal-id="C10" aria-label={copy.title}>
      <div className="row">
        <p className="label">1 square = 1 KB · {waffleLabel(mode)}</p>
        <div className="controls">
          <button type="button" className={mode === 'js' ? 'btn on' : 'btn'} aria-pressed={mode === 'js'} onClick={() => setMode('js')}>
            2025 median JS
          </button>
          <button type="button" className={mode === 'first' ? 'btn on' : 'btn'} aria-pressed={mode === 'first'} onClick={() => setMode('first')}>
            First website, whole page
          </button>
        </div>
      </div>
      <div className="waffle" aria-hidden="true">
        {Array.from({ length: JS_SQUARES }, (_, index) => {
          const on = index < lit
          const old = mode === 'first' && on
          return <span key={index} className={old ? 'kb old' : on ? 'kb js' : 'kb'} />
        })}
      </div>
      <div className="split">
        <pre>{`export default function Page() {
  return <h1>Hello, world</h1>;
}
// 20 bytes of meaning,
// shipped inside a framework runtime.`}</pre>
        <p className="note">{waffleNote(mode)}</p>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #7FD1FF; --bg: #03090c; --muted: #cfe6f2; --line: #1f3a48; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; display: flex; flex-direction: column; gap: 14px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #d4eaf6; }
.era .row, .era .controls, .era .split { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.era .split { align-items: flex-start; gap: 16px; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #04141c; }
.era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .waffle { display: grid; grid-template-columns: repeat(40, minmax(0, 1fr)); gap: 2px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; }
.era .kb { aspect-ratio: 1; border-radius: 1px; background: #12252e; }
.era .kb.js { background: var(--ink); }
.era .kb.old { background: #E4EAF0; }
.era pre { flex: 1 1 280px; margin: 0; padding: 12px; background: #000; border: 1px solid var(--line); border-radius: 6px; font-size: 12.5px; line-height: 1.5; color: var(--ink); white-space: pre; }
.era .note { flex: 1 1 280px; margin: 0; font-size: 13px; line-height: 1.6; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; } }
`
