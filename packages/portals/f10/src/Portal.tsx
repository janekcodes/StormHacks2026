'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { ATTENTION, NEXT_STEPS, PROMPT, TOKENS, sampleNext } from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('F10')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [selected, setSelected] = useState(4)
  const [generated, setGenerated] = useState<string[]>([])
  const row = ATTENTION[selected] ?? ATTENTION[0] ?? []
  const max = Math.max(...row, 0.001)
  const step = generated.length
  const candidates = NEXT_STEPS[step] ?? []
  const done = step >= NEXT_STEPS.length

  return (
    <section className="era" data-testid="portal-package" data-portal-id="F10" aria-label={copy.title}>
      <div className="layout">
        <div className="attn">
          <p className="label">Illustrative self-attention · &quot;{TOKENS[selected]}&quot; looks at...</p>
          <div className="tokens">
            {TOKENS.map((word, index) => {
              const weight = row[index] ?? 0
              const alpha = 0.25 + (weight / max) * 0.75
              return (
                <button
                  key={word}
                  type="button"
                  className={index === selected ? 'tok sel' : 'tok'}
                  style={{ boxShadow: `inset 0 -4px 0 rgba(127,209,255,${alpha.toFixed(2)})` }}
                  aria-pressed={index === selected}
                  aria-label={`${word}, illustrative attention ${Math.round(weight * 100)} percent. Select to see where it looks.`}
                  onClick={() => setSelected(index)}
                >
                  {word}
                </button>
              )
            })}
          </div>
          <div className="bars">
            {TOKENS.map((word, index) => {
              const weight = row[index] ?? 0
              return (
                <div key={word} className="bar-row">
                  <span>{word}</span>
                  <span className="bar" style={{ width: `${(weight / max) * 100}%` }} />
                  <span>{Math.round(weight * 100)}%</span>
                </div>
              )
            })}
          </div>
          <p className="fine">Illustrative weights, not from a real model. Real models run dozens of these heads in parallel per layer.</p>
        </div>
        <div className="next">
          <p className="label">Illustrative next-token prediction</p>
          <p className="sentence">
            {PROMPT} {generated.join(' ')}
            <span className="caret" aria-hidden="true">
              ▍
            </span>
          </p>
          <div className="bars">
            {candidates.map((candidate) => (
              <div key={candidate.word} className="bar-row">
                <span>{candidate.word}</span>
                <span className="bar pale" style={{ width: `${candidate.p * 100}%` }} />
                <span>{Math.round(candidate.p * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="fine">Illustrative next-token odds, not real model output.</p>
          <div className="controls">
            <button
              type="button"
              className="btn"
              disabled={done}
              onClick={() => {
                const word = sampleNext(step, Math.random())
                if (word) setGenerated((current) => [...current, word])
              }}
            >
              Sample next token
            </button>
            <button type="button" className="btn" onClick={() => setGenerated([])}>
              Reset
            </button>
          </div>
        </div>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #7FD1FF; --bg: #03090c; --muted: #cfe6f2; --line: #1f3a48; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; }
.era .layout { display: flex; flex-wrap: wrap; gap: 26px; }
.era .attn, .era .next { flex: 1 1 320px; display: flex; flex-direction: column; gap: 12px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #d4eaf6; }
.era .tokens, .era .controls { display: flex; flex-wrap: wrap; gap: 8px; }
.era .tok { appearance: none; cursor: pointer; min-height: 44px; padding: 0 12px; border-radius: 6px; border: 1px solid #2f6680; background: #041018; color: #e9f7ff; font-family: "IBM Plex Mono", monospace; font-size: 15px; }
.era .tok.sel { border: 2px solid #fff; }
.era .tok:focus-visible, .era .btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .bars { display: flex; flex-direction: column; gap: 5px; }
.era .bar-row { display: grid; grid-template-columns: 88px minmax(0, 1fr) 44px; gap: 8px; align-items: center; font-size: 12px; color: var(--muted); }
.era .bar { height: 10px; background: var(--ink); display: block; min-width: 2px; }
.era .bar.pale { height: 8px; background: #E4EAF0; }
.era .fine { margin: 0; font-size: 11px; color: #d4eaf6; line-height: 1.5; }
.era .sentence { margin: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 15px; line-height: 1.5; color: #e9f7ff; min-height: 48px; }
.era .caret { color: var(--ink); }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn:disabled { opacity: .45; cursor: default; }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; transition: none !important; } }
`
