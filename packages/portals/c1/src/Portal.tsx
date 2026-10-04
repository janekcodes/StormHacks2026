'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { program, type ProgramId, type Unit } from './logic'
import { useReducedMotion } from './motion'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('C1')

const POS: Record<Unit, number> = {
  ACC1: 75,
  ACC2: 205,
  ACC3: 335,
  ACC4: 465,
  MULT: 595,
  PRINT: 725
}

const STROKES = ['#FFB347', '#E86A4A', '#7FD1FF', '#8DF7A9']

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [prog, setProg] = useState<ProgramId>('A')
  const [rewiring, setRewiring] = useState(false)
  const [pending, setPending] = useState<ProgramId>('A')
  const reduced = useReducedMotion()
  const current = program(prog)

  useEffect(() => {
    if (!rewiring) return
    if (reduced) {
      setProg(pending)
      setRewiring(false)
      return
    }
    const timer = window.setTimeout(() => {
      setProg(pending)
      setRewiring(false)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [rewiring, pending, reduced])

  function choose(next: ProgramId) {
    if (next === prog || rewiring) return
    setPending(next)
    setRewiring(true)
  }

  return (
    <section className="era" data-testid="portal-package" data-portal-id="C1" aria-label={copy.title}>
      <div className="row">
        <p className="label">Plugboard · {rewiring ? 'Rewiring' : current.name}</p>
        <div className="controls">
          <button type="button" className={prog === 'A' && !rewiring ? 'btn on' : 'btn'} aria-pressed={prog === 'A'} onClick={() => choose('A')}>
            Program A · add
          </button>
          <button type="button" className={prog === 'B' && !rewiring ? 'btn on' : 'btn'} aria-pressed={prog === 'B'} onClick={() => choose('B')}>
            Program B · multiply
          </button>
        </div>
      </div>
      <div className="panel">
        {rewiring ? (
          <div className="rewire">
            <p className="vt">REWIRING...</p>
            <p className="note">In 1946 this step took the programmers days, not milliseconds.</p>
          </div>
        ) : (
          <svg viewBox="0 0 800 300" width="100%" role="img" aria-label={current.aria}>
            {(['ACC1', 'ACC2', 'ACC3', 'ACC4', 'MULT', 'PRINT'] as const).map((unit) => (
              <g key={unit}>
                <rect x={(POS[unit] ?? 0) - 55} y={30} width={110} height={110} rx={4} fill="#2a2520" stroke="#6b5a40" />
                <text x={POS[unit]} y={90} textAnchor="middle" fill="#e8d9bb" fontFamily="Chakra Petch, sans-serif" fontWeight={700} fontSize={14}>
                  {unit === 'ACC1' ? 'ACC 1' : unit === 'ACC2' ? 'ACC 2' : unit === 'ACC3' ? 'ACC 3' : unit === 'ACC4' ? 'ACC 4' : unit}
                </text>
                <circle cx={POS[unit]} cy={150} r={8} fill="#0b0907" stroke="#8a7350" strokeWidth={2} />
              </g>
            ))}
            {current.routes.map((route, index) => {
              const from = POS[route.from]
              const to = POS[route.to]
              const drop = 220 + index * 20
              return (
                <path
                  key={`${route.from}-${route.to}`}
                  className="wire"
                  d={`M${from} 150 C${from} ${drop} ${to} ${drop} ${to} 150`}
                  fill="none"
                  stroke={STROKES[index] ?? '#FFB347'}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>
        )}
      </div>
      <div className="split">
        <p className="note">{current.description}</p>
        <div>
          <p className="label">The stored-program version (late 1940s)</p>
          <pre>{current.listing}</pre>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #FFB347; --bg: #0a0806; --muted: #e8d9bb; --line: #3a3022; --panel: #15110c; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; display: flex; flex-direction: column; gap: 16px; }
.era .label { margin: 0 0 6px; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #e8d9bb; }
.era .vt { margin: 0; font-family: "VT323", monospace; font-size: 40px; }
.era .row, .era .controls, .era .split { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.era .split { align-items: flex-start; gap: 16px; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #1a1208; }
.era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; overflow-x: auto; }
.era svg { min-width: 560px; display: block; }
.era .wire { stroke-dasharray: 6 4; animation: flow 1s linear infinite; }
.era .rewire { height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.era .note { flex: 1 1 300px; margin: 0; font-size: 13px; line-height: 1.6; color: var(--muted); }
.era pre { flex: 1 1 300px; margin: 0; padding: 12px; background: #000; border: 1px solid var(--line); border-radius: 6px; font-size: 12.5px; line-height: 1.5; color: var(--ink); }
@keyframes flow { to { stroke-dashoffset: -20; } }
@media (prefers-reduced-motion: reduce) { .era .wire { animation: none; } }
`
