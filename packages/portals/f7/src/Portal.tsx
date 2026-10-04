'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import {
  DEEP_BLUE_PER_S,
  DEEP_THOUGHT_PER_S,
  MAX_DEPTH,
  formatCount,
  formatDuration,
  positions,
  searchSeconds
} from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('F7')

const BLACK_BACK = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜']
const WHITE_BACK = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']

function piece(row: number, col: number): string {
  if (row === 0) return BLACK_BACK[col] ?? ''
  if (row === 1) return '♟'
  if (row === 6) return '♙'
  if (row === 7) return WHITE_BACK[col] ?? ''
  return ''
}

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [depth, setDepth] = useState(4)
  const count = positions(depth)
  const span = Math.log10(positions(MAX_DEPTH))

  return (
    <section className="era" data-testid="portal-package" data-portal-id="F7" aria-label={copy.title}>
      <div className="layout">
        <div>
          <div className="board" aria-hidden="true">
            {Array.from({ length: 64 }, (_, index) => {
              const row = Math.floor(index / 8)
              const col = index % 8
              const light = (row + col) % 2 === 0
              return (
                <span key={index} className={light ? 'sq light' : 'sq dark'}>
                  {piece(row, col)}
                </span>
              )
            })}
          </div>
          <p className="note">About 20 legal first moves; mid-game positions average around 35.</p>
        </div>
        <div className="side">
          <label className="label" htmlFor="depth">
            Search depth · {depth} half-moves ahead
          </label>
          <input
            id="depth"
            type="range"
            min={1}
            max={12}
            step={1}
            value={depth}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10)
              if (Number.isInteger(value)) setDepth(value)
            }}
          />
          <div className="fan" aria-hidden="true">
            {Array.from({ length: depth }, (_, index) => {
              const d = index + 1
              const width = Math.min(100, (Math.log10(positions(d)) / span) * 100)
              return (
                <div key={d} className="fan-row">
                  <span>d{d}</span>
                  <span className="bar" style={{ width: `${width}%`, opacity: 0.35 + (0.65 * d) / 12 }} />
                </div>
              )
            })}
          </div>
          <p className="vt">{formatCount(count)} positions</p>
          <div className="times">
            <div>
              <p className="label">Deep Thought · ~700K/s</p>
              <p className="vt">{formatDuration(searchSeconds(depth, DEEP_THOUGHT_PER_S))}</p>
            </div>
            <div>
              <p className="label">Deep Blue · ~200M/s</p>
              <p className="vt">{formatDuration(searchSeconds(depth, DEEP_BLUE_PER_S))}</p>
            </div>
          </div>
          <p className="note">
            Full-width search with no pruning. Real engines cut most branches with alpha-beta pruning, which is how Deep Blue reached useful depths.
          </p>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #E4EAF0; --bg: #08090a; --muted: #d5dde4; --line: #2a2e33; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; }
.era .layout { display: flex; flex-wrap: wrap; gap: 26px; }
.era .side { flex: 1 1 320px; display: flex; flex-direction: column; gap: 14px; }
.era .label { font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.era .board { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); border: 3px solid #4a5058; max-width: 300px; }
.era .sq { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 22px; line-height: 1; font-family: serif; color: #111; }
.era .sq.light { background: #cfd5db; }
.era .sq.dark { background: #5b636c; }
.era input { width: 100%; accent-color: var(--ink); height: 28px; }
.era input:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
.era .fan { display: flex; flex-direction: column; gap: 4px; }
.era .fan-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.era .fan-row span:first-child { width: 24px; color: var(--muted); }
.era .bar { height: 8px; background: var(--ink); display: block; }
.era .vt { margin: 0; font-family: "VT323", monospace; font-size: 28px; line-height: 1.1; }
.era .times { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.era .times div { border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.era .note { margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; } }
`
