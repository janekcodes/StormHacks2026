'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import {
  FIRST_PAGE_SECONDS,
  MEDIAN_PAGE_SECONDS,
  clockLabel,
  nextClock,
  progress
} from './logic'
import { useReducedMotion } from './motion'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('D6')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [t, setT] = useState(0)
  const [running, setRunning] = useState(false)
  const reduced = useReducedMotion()
  const oldP = progress(t, FIRST_PAGE_SECONDS)
  const newP = progress(t, MEDIAN_PAGE_SECONDS)
  const speed = !running ? 'IDLE' : t < FIRST_PAGE_SECONDS + 0.5 ? 'REAL TIME' : '100x SPEED'

  useEffect(() => {
    if (!running) return
    if (reduced) {
      setT(MEDIAN_PAGE_SECONDS)
      setRunning(false)
      return
    }
    const timer = window.setInterval(() => {
      setT((current) => Math.min(MEDIAN_PAGE_SECONDS, nextClock(current)))
    }, 50)
    return () => window.clearInterval(timer)
  }, [running, reduced])

  useEffect(() => {
    if (t >= MEDIAN_PAGE_SECONDS && running) setRunning(false)
  }, [t, running])

  const oldStatus = oldP >= 1 ? 'LOADED · 1.14 s' : t > 0 ? `${Math.round(oldP * 100)}%` : 'READY'
  const newStatus =
    newP >= 1 ? 'LOADED · 1,422 s' : t > 0 ? `${(newP * 100).toFixed(1)}%` : 'READY'

  return (
    <section className="era" data-testid="portal-package" data-portal-id="D6" aria-label={copy.title}>
      <div className="row">
        <div className="modem">
          <span className="label dark">Modem 14.4k</span>
          <span className="leds">
            <i className={running || t > 0 ? 'led on' : 'led'} /> CD
            <i className={running ? 'led on' : 'led'} /> RD
            <i className={running ? 'led on2' : 'led'} /> SD
          </span>
        </div>
        <p className="vt">
          SIM CLOCK {clockLabel(t)} · {speed}
        </p>
      </div>
      <div className="panel">
        <Bar label="The first web page, 1991 · ~2 KB" status={oldStatus} width={oldP * 100} tone="page" />
        <Bar
          label="Median mobile home page, 2025 · 2.56 MB"
          status={newStatus}
          width={newP * 100}
          tone="median"
        />
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
            setT(0)
            setRunning(true)
          }}
        >
          {running ? 'Hang up' : t > 0 ? 'Redial' : 'Dial in'}
        </button>
        <p className="note">
          Runs in real time until the 1991 page lands, then jumps to 100x speed. Real time on the line: about 1.14 seconds vs 1,422 seconds. Page weights: HTTP Archive Web Almanac 2025. The 1991 size (~2 KB) is an approximation.
        </p>
      </div>
      <style>{css}</style>
    </section>
  )
}

function Bar({
  label,
  status,
  width,
  tone
}: {
  label: string
  status: string
  width: number
  tone: 'page' | 'median'
}) {
  return (
    <div className="bar-block">
      <div className="bar-top">
        <span>{label}</span>
        <span className="vt">{status}</span>
      </div>
      <div className="track">
        <div className={tone === 'page' ? 'fill page' : 'fill median'} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

const css = `
.era { --ink: #E4EAF0; --bg: #08090a; --muted: #d5dde4; --line: #2a2e33; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; display: flex; flex-direction: column; gap: 18px; }
.era .label { font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
.era .label.dark { color: #333; }
.era .vt { margin: 0; font-family: "VT323", monospace; font-size: 22px; }
.era .row, .era .controls { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.era .controls { justify-content: flex-start; }
.era .modem { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: 1px solid #3a4048; border-radius: 8px; background: #c9ced4; color: #111; }
.era .leds { display: flex; gap: 6px; align-items: center; font-size: 10px; }
.era .led { width: 10px; height: 10px; border-radius: 50%; background: #2a2e33; display: inline-block; }
.era .led.on { background: #5dff9a; box-shadow: 0 0 8px #5dff9a; animation: blink .3s steps(2) infinite; }
.era .led.on2 { background: #ffb347; box-shadow: 0 0 8px #ffb347; animation: blink .45s steps(2) infinite; }
.era .panel { display: flex; flex-direction: column; gap: 14px; padding: 18px; border: 1px solid var(--line); border-radius: 8px; }
.era .bar-block { display: flex; flex-direction: column; gap: 6px; }
.era .bar-top { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.era .track { height: 22px; background: #16191c; border: 1px solid #3a4048; }
.era .fill { height: 100%; }
.era .fill.page { background: var(--ink); }
.era .fill.median { background: #ffb347; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #111; }
.era .btn:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
.era .note { margin: 0; flex: 1 1 280px; font-size: 12px; line-height: 1.5; color: var(--muted); }
@keyframes blink { 50% { opacity: .3 } }
@media (prefers-reduced-motion: reduce) { .era .led.on, .era .led.on2 { animation: none; } }
`
