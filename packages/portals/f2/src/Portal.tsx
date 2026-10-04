'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { PROPOSERS, PROVED_LIMIT, THEOREM_COUNT, nextProved } from './logic'
import { useReducedMotion } from './motion'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('F2')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [person, setPerson] = useState(0)
  const [proved, setProved] = useState(0)
  const [running, setRunning] = useState(false)
  const reduced = useReducedMotion()
  const note = PROPOSERS[person]?.note ?? ''

  useEffect(() => {
    if (!running) return
    if (proved >= PROVED_LIMIT) {
      setRunning(false)
      return
    }
    if (reduced) {
      setProved(PROVED_LIMIT)
      setRunning(false)
      return
    }
    const timer = window.setInterval(() => {
      setProved((current) => nextProved(current))
    }, 70)
    return () => window.clearInterval(timer)
  }, [running, proved, reduced])

  return (
    <section className="era" data-testid="portal-package" data-portal-id="F2" aria-label={copy.title}>
      <div className="layout">
        <div className="board">
          <p className="label">The chalkboard · tap a proposer</p>
          <div className="chalk">
            <p className="quote">
              &quot;...every aspect of learning or any other feature of intelligence can in principle be so precisely described that a machine can be made to simulate it.&quot;
            </p>
            <div className="people">
              {PROPOSERS.map((proposer, index) => (
                <button
                  key={proposer.initials}
                  type="button"
                  className={index === person ? 'person on' : 'person'}
                  aria-pressed={index === person}
                  onClick={() => setPerson(index)}
                >
                  <span className="vt">{proposer.initials}</span>
                  <span>{proposer.name}</span>
                </button>
              ))}
            </div>
            <p className="note">{note}</p>
          </div>
          <p className="cite">Quote: the 1955 Dartmouth proposal.</p>
        </div>
        <div className="lt">
          <p className="label">Logic Theorist vs Principia Mathematica, ch. 2</p>
          <p className="vt big">
            {proved} / {THEOREM_COUNT} proved
          </p>
          <div className="squares" aria-hidden="true">
            {Array.from({ length: THEOREM_COUNT }, (_, index) => (
              <span key={index} className={index < proved ? 'sq lit' : 'sq'} />
            ))}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setProved(0)
              setRunning(true)
            }}
          >
            {proved >= PROVED_LIMIT ? 'Run again' : 'Run Logic Theorist'}
          </button>
          <p className="note">
            Newell, Simon and Shaw&apos;s program proved 38 of the first 52 theorems by searching for proofs the way a person might, with rules of thumb. It was the star exhibit of 1956.
          </p>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #8DF7A9; --bg: #050a07; --muted: #c7e8d2; --line: #1f3a2a; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; }
.era .layout { display: flex; flex-wrap: wrap; gap: 24px; }
.era .board, .era .lt { flex: 1 1 320px; display: flex; flex-direction: column; gap: 12px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #d7f5e0; }
.era .vt { font-family: "VT323", monospace; font-size: 30px; line-height: 1; }
.era .big { margin: 0; font-size: 30px; }
.era .chalk { background: #1f3a2c; border: 6px solid #5a4a36; border-radius: 6px; padding: 18px; display: flex; flex-direction: column; gap: 16px; color: #e9efe8; }
.era .quote { margin: 0; font-family: "VT323", monospace; font-size: 22px; line-height: 1.2; }
.era .people { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 10px; }
.era .person { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px; min-height: 84px; border-radius: 8px; border: 1px dashed #c7d6c9; background: transparent; color: #e9efe8; cursor: pointer; font-family: "IBM Plex Mono", monospace; }
.era .person.on { background: rgba(233,239,232,.14); border-style: solid; }
.era .person:focus-visible, .era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; align-self: flex-start; }
.era .squares { display: grid; grid-template-columns: repeat(13, minmax(0, 1fr)); gap: 4px; }
.era .sq { aspect-ratio: 1; border-radius: 2px; border: 1px solid #2f4a39; }
.era .sq.lit { background: var(--ink); border-color: var(--ink); box-shadow: 0 0 6px rgba(141,247,169,.6); }
.era .note, .era .cite { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted); }
.era .cite { font-size: 11px; }
.era .note { border-top: 1px dashed #7d917f; padding-top: 10px; }
.era .lt .note { border-top: 0; padding-top: 0; }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; } }
`
