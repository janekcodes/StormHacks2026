'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { DOTS, INITIAL_DEAD, TUBES_PER_DOT, okCount, powerCycle, replaceTube } from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('B2')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [dead, setDead] = useState<number[]>([...INITIAL_DEAD])
  const deadSet = new Set(dead)
  const hint = dead.length
    ? 'Click the dark, flickering tubes to replace them.'
    : 'All tubes lit. ENIAC is computing.'

  return (
    <section className="era" data-testid="portal-package" data-portal-id="B2" aria-label={copy.title}>
      <div className="layout">
        <div className="wall">
          <div className="row">
            <p className="label">
              Tube wall · {DOTS} dots × {TUBES_PER_DOT} tubes
            </p>
            <p className="vt">
              {okCount(dead)} / {DOTS} OK
            </p>
          </div>
          <div className="grid" role="group" aria-label="ENIAC tube wall">
            {Array.from({ length: DOTS }, (_, index) => {
              const isDead = deadSet.has(index)
              return (
                <button
                  key={index}
                  type="button"
                  className={isDead ? 'tube dead' : 'tube'}
                  aria-label={isDead ? `Burned-out tube ${index + 1}, replace it` : `Working tube ${index + 1}`}
                  onClick={() => {
                    if (isDead) setDead((current) => replaceTube(current, index))
                  }}
                />
              )
            })}
          </div>
          <div className="controls">
            <button type="button" className="btn" onClick={() => setDead(powerCycle(Math.random))}>
              Power cycle
            </button>
            <span className="hint">{hint}</span>
          </div>
        </div>
        <div className="aside">
          <p className="label">How big? Lengths, to scale</p>
          <Scale label="ENIAC's panels, end to end · ~24 m" width="100%" tone="ink" />
          <Scale label="A person · 1.7 m" width="7%" tone="muted" />
          <Scale label="A smartphone · 0.15 m" width="0.6%" tone="muted" />
          <p className="note">
            The phone does billions of operations a second on a few watts. ENIAC did 5,000 additions a second on about 150 kW.
          </p>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

function Scale({ label, width, tone }: { label: string; width: string; tone: 'ink' | 'muted' }) {
  return (
    <div className="scale">
      <span>{label}</span>
      <span className={tone === 'ink' ? 'bar ink' : 'bar'} style={{ width }} />
    </div>
  )
}

const css = `
.era { --ink: #FFB347; --bg: #0a0806; --muted: #e8d9bb; --dim: #c9b896; --line: #3a3022; --panel: #15110c; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; }
.era .layout { display: flex; flex-wrap: wrap; gap: 24px; }
.era .wall { flex: 999 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.era .aside { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #e8d9bb; }
.era .vt { margin: 0; font-family: "VT323", monospace; font-size: 24px; }
.era .row, .era .controls { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
.era .controls { justify-content: flex-start; }
.era .grid { display: grid; grid-template-columns: repeat(25, minmax(0, 1fr)); gap: 5px; padding: 14px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
.era .tube { appearance: none; border: 0; padding: 0; width: 100%; aspect-ratio: 1; border-radius: 50%; background: var(--ink); box-shadow: 0 0 6px rgba(255,179,71,.7); cursor: default; }
.era .tube.dead { background: #2b241b; box-shadow: inset 0 0 0 1px #5a4a36; cursor: pointer; animation: dead 1s steps(2) infinite; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn:focus-visible, .era .tube:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .hint, .era .scale span, .era .note { font-size: 12px; color: var(--muted); line-height: 1.5; }
.era .note { margin: 8px 0 0; padding: 14px; border: 1px solid var(--line); border-radius: 8px; font-size: 13px; }
.era .scale { display: flex; flex-direction: column; gap: 4px; }
.era .bar { display: block; height: 14px; background: var(--muted); min-width: 2px; }
.era .bar.ink { background: var(--ink); width: 100%; }
@keyframes dead { 50% { opacity: .5 } }
@media (prefers-reduced-motion: reduce) { .era .tube.dead { animation: none; } }
`
