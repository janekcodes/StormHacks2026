'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { DONE_AT, systolicAt } from './logic'
import { useReducedMotion } from './motion'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('B11')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [t, setT] = useState(0)
  const [running, setRunning] = useState(false)
  const reduced = useReducedMotion()
  const grid = systolicAt(t)

  useEffect(() => {
    if (!running) return
    if (reduced) {
      setT(DONE_AT)
      setRunning(false)
      return
    }
    const timer = window.setInterval(() => {
        setT((current) => (current >= DONE_AT ? current : current + 1))
    }, 600)
    return () => window.clearInterval(timer)
  }, [running, reduced])

  useEffect(() => {
    if (t >= DONE_AT && running) setRunning(false)
  }, [t, running])

  return (
    <section className="era" data-testid="portal-package" data-portal-id="B11" aria-label={copy.title}>
      <div className="layout">
        <div className="grid-wrap">
          <p className="label">
            4 × 4 systolic array · cycle {t} of {DONE_AT} · {grid.macs} / 64 MACs
          </p>
          <div className="grid">
            <div className="grid-row">
              <span />
              {grid.topFeed.map((feed, index) => (
                <span key={index} className="feed top">
                  {feed}
                </span>
              ))}
            </div>
            {grid.cells.map((row, i) => (
              <div key={i} className="grid-row">
                <span className="feed left">{grid.leftFeed[i]}</span>
                {row.map((cell, j) => (
                  <div key={j} className={cell.active ? 'pe on' : cell.done ? 'pe done' : 'pe'}>
                    <span className="val">{cell.value}</span>
                    <span className="id">c{i}{j}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="controls">
            <button
              type="button"
              className={running ? 'btn on' : 'btn'}
              onClick={() => {
                if (running) {
                  setRunning(false)
                  return
                }
                if (t >= DONE_AT) setT(0)
                setRunning(true)
              }}
            >
              {running ? 'Pause' : t >= DONE_AT ? 'Run again' : 'Run matmul'}
            </button>
            <button type="button" className="btn" onClick={() => setT((current) => (current < DONE_AT ? current + 1 : current))}>
              Step
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setRunning(false)
                setT(0)
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="note">
          <p>
            <span className="orange">Orange</span> values of A stream in from the left, <span className="white">white</span> values of B from the top. Each cell multiplies what passes through and adds it to its running total. The lit diagonal is the wavefront.
          </p>
          <p>No cell asks memory for anything mid-computation. Data pulses through the grid, which is why the array is called systolic.</p>
          <p className="box">This toy grid has 16 cells. Google&apos;s first TPU had a 256 × 256 grid: 65,536 multiply-accumulates every cycle.</p>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #7FD1FF; --bg: #03090c; --muted: #cfe6f2; --line: #1f3a48; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; }
.era .layout { display: flex; flex-wrap: wrap; gap: 26px; }
.era .grid-wrap { flex: 1 1 380px; display: flex; flex-direction: column; gap: 10px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #d4eaf6; }
.era .grid { display: flex; flex-direction: column; gap: 6px; }
.era .grid-row { display: grid; grid-template-columns: 72px repeat(4, minmax(0, 1fr)); gap: 6px; align-items: center; }
.era .feed { font-family: "VT323", monospace; font-size: 18px; min-height: 22px; }
.era .feed.top { color: #E4EAF0; text-align: center; }
.era .feed.left { color: #ffb347; text-align: right; }
.era .pe { border: 1px solid var(--line); border-radius: 6px; background: #06131a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 64px; }
.era .pe.on { background: #0f3a4f; border-color: var(--ink); box-shadow: 0 0 14px rgba(127,209,255,.45); }
.era .pe.done { border-color: #2f6680; }
.era .val { font-family: "VT323", monospace; font-size: 28px; color: #e9f7ff; line-height: 1; }
.era .id { font-size: 9px; color: #9ec3d4; }
.era .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #04141c; }
.era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .note { flex: 1 1 260px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.6; color: var(--muted); }
.era .note p { margin: 0; }
.era .orange { color: #ffb347; }
.era .white { color: #E4EAF0; }
.era .box { border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
@media (prefers-reduced-motion: reduce) { .era .pe { transition: none; } }
`
