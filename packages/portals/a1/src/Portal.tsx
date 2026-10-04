'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import {
  RULES,
  activeRule,
  initialMachine,
  runUntilHalt,
  step,
  tapeReading,
  type Machine
} from './logic'
import { useReducedMotion } from './motion'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('A1')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [machine, setMachine] = useState<Machine>(initialMachine)
  const [running, setRunning] = useState(false)
  const reduced = useReducedMotion()
  const halted = machine.state === 'halt'
  const current = activeRule(machine)

  useEffect(() => {
    if (!running) return
    if (reduced) {
      setMachine((currentMachine) => runUntilHalt(currentMachine))
      setRunning(false)
      return
    }
    const timer = window.setInterval(() => {
      setMachine((currentMachine) => (currentMachine.state === 'halt' ? currentMachine : step(currentMachine)))
    }, 450)
    return () => window.clearInterval(timer)
  }, [running, reduced])

  useEffect(() => {
    if (halted && running) setRunning(false)
  }, [halted, running])

  return (
    <section className="era" data-testid="portal-package" data-portal-id="A1" aria-label={copy.title}>
      <div className="row">
        <p className="label">
          Binary incrementer · state {machine.state} · step {machine.steps}
        </p>
        <p className="vt">{tapeReading(machine.tape) || 'blank'}</p>
      </div>
      <div className="tape" role="img" aria-label={`Tape reading ${tapeReading(machine.tape) || 'blank'}, head on cell ${machine.head + 1}`}>
        {machine.tape.map((symbol, index) => (
          <div key={index} className="tape-cell">
            <span className="arrow" aria-hidden="true">
              {index === machine.head ? '▼' : ''}
            </span>
            <span className={index === machine.head ? 'cell head' : 'cell'}>{symbol === '_' ? '' : symbol}</span>
          </div>
        ))}
      </div>
      <div className="controls">
        <button type="button" className="btn" onClick={() => setMachine((m) => step(m))} disabled={halted || running}>
          Step
        </button>
        <button
          type="button"
          className={running ? 'btn on' : 'btn'}
          onClick={() => setRunning((value) => !value)}
          disabled={halted}
        >
          {running ? 'Pause' : 'Run'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setRunning(false)
            setMachine(initialMachine())
          }}
        >
          Reset
        </button>
      </div>
      <div className="split">
        <table className="rules">
          <caption>Transition rules</caption>
          <thead>
            <tr>
              <th>State</th>
              <th>Read</th>
              <th>Write</th>
              <th>Move</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((rule) => {
              const on = current?.state === rule.state && current.read === rule.read
              return (
                <tr key={`${rule.state}-${rule.read}`} className={on ? 'on' : undefined}>
                  <td>{rule.state}</td>
                  <td>{rule.read === '_' ? 'blank' : rule.read}</td>
                  <td>{rule.write === '_' ? 'blank' : rule.write}</td>
                  <td>{rule.move}</td>
                  <td>{rule.next}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="note">
          The whole program is the six-row table. Turing&apos;s insight was that the table itself can be written on the tape, so one universal machine can run any table. That is software.
        </p>
      </div>
      <style>{css}</style>
    </section>
  )
}

const css = `
.era { --ink: #FFB347; --bg: #0a0806; --muted: #e8d9bb; --dim: #c9b896; --line: #3a3022; --panel: #15110c; --label: #e8d9bb; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; display: flex; flex-direction: column; gap: 16px; }
.era .label { margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 600; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--label); }
.era .vt { margin: 0; font-family: "VT323", monospace; font-size: 26px; }
.era .row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #1a1208; }
.era .btn:disabled { opacity: .45; cursor: default; }
.era .btn:focus-visible, .era .cell:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.era .controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.era .tape { display: flex; gap: 0; width: max-content; margin: 0 auto; overflow-x: auto; }
.era .tape-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.era .arrow { height: 26px; font-size: 20px; line-height: 26px; }
.era .cell { width: 46px; height: 52px; display: flex; align-items: center; justify-content: center; border: 1px solid #5a4a36; background: #efe3c2; color: #2a2520; font-family: "VT323", monospace; font-size: 32px; }
.era .cell.head { background: var(--ink); border-color: var(--ink); }
.era .split { display: flex; flex-wrap: wrap; gap: 18px; }
.era .rules { flex: 1 1 320px; border: 1px solid var(--line); border-radius: 8px; border-collapse: collapse; font-size: 12px; }
.era .rules caption { caption-side: top; text-align: left; padding: 8px; color: var(--dim); font-family: "Chakra Petch", sans-serif; letter-spacing: .12em; text-transform: uppercase; }
.era .rules th, .era .rules td { padding: 4px 8px; text-align: left; font-weight: 500; }
.era .rules th { color: var(--dim); }
.era .rules tr.on { background: var(--ink); color: #1a1208; }
.era .rules tr.on th, .era .rules tr.on td { color: #1a1208; }
.era .note { flex: 1 1 260px; margin: 0; font-size: 13px; line-height: 1.6; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; transition: none !important; } }
`
