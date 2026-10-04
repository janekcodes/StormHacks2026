'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { lampOn } from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('B3')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [base, setBase] = useState(false)
  const lit = lampOn(base)
  const circuitLabel = lit
    ? 'Base current on: current flows from collector to emitter and the lamp is lit'
    : 'Base current off: no current flows and the lamp is dark'

  return (
    <section className="era" data-testid="portal-package" data-portal-id="B3" aria-label={copy.title}>
      <div className="layout">
        <div className="main">
          <p className="label">A transistor is a switch · base {lit ? 'ON' : 'OFF'}</p>
          <svg viewBox="0 0 380 320" role="img" aria-label={circuitLabel}>
            <g fill="none" stroke="#3d5a48" strokeWidth={3}>
              <path d="M240 20 L240 70" />
              <path d="M240 130 L240 190" />
              <path d="M240 250 L240 300" />
              <path d="M60 160 L170 160" />
            </g>
            {lit ? (
              <g fill="none" stroke="#8DF7A9" strokeWidth={3} className="flow">
                <path d="M240 20 L240 70" />
                <path d="M240 130 L240 190" />
                <path d="M240 250 L240 300" />
                <path d="M60 160 L170 160" />
              </g>
            ) : null}
            <circle cx={240} cy={100} r={30} fill={lit ? '#8DF7A9' : '#08140c'} stroke="#8DF7A9" strokeWidth={3} />
            <text x={282} y={106} fill="#c7e8d2" fontFamily="Chakra Petch, sans-serif" fontSize={14}>
              LAMP
            </text>
            <circle cx={210} cy={220} r={44} fill="#08140c" stroke="#8DF7A9" strokeWidth={2.5} />
            <text x={210} y={226} textAnchor="middle" fill="#8DF7A9" fontFamily="VT323, monospace" fontSize={22}>
              {lit ? 'ON' : 'OFF'}
            </text>
            <g fill="#c7e8d2" fontFamily="Chakra Petch, sans-serif" fontSize={13}>
              <text x={250} y={186}>collector</text>
              <text x={250} y={262}>emitter</text>
              <text x={70} y={150}>base</text>
            </g>
          </svg>
          <div className="controls">
            <button type="button" className={lit ? 'btn on' : 'btn'} aria-pressed={lit} onClick={() => setBase((value) => !value)}>
              Base current: {lit ? 'ON' : 'OFF'}
            </button>
            <span className="note">A small current at the base lets a large one flow from collector to emitter.</span>
          </div>
        </div>
        <div className="aside">
          <p className="label">The same job, three generations</p>
          <ul className="gens">
            <li>Vacuum tube, 1940s</li>
            <li>Silicon transistor, 1954</li>
            <li>Modern transistor, nanometres wide</li>
          </ul>
          <p className="note">
            Icons in the prototype show relative size only loosely. The real gap is wider: today&apos;s chips pack billions of transistors into the space of a fingernail.
          </p>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #8DF7A9; --bg: #050a07; --muted: #c7e8d2; --line: #1f3a2a; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; }
.era .layout { display: flex; flex-wrap: wrap; gap: 28px; }
.era .main { flex: 1 1 360px; display: flex; flex-direction: column; gap: 12px; }
.era .aside { flex: 1 1 280px; display: flex; flex-direction: column; gap: 16px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #d7f5e0; }
.era svg { width: 100%; max-width: 420px; display: block; }
.era .flow { stroke-dasharray: 8 6; animation: flow .6s linear infinite; }
.era .controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #08170e; }
.era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .note { margin: 0; font-size: 13px; line-height: 1.6; color: var(--muted); }
.era .gens { margin: 0; padding: 18px 18px 18px 36px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); line-height: 1.8; }
@keyframes flow { to { stroke-dashoffset: -28; } }
@media (prefers-reduced-motion: reduce) { .era .flow { animation: none; } }
`
