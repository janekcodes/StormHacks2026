export type Cell = '0' | '1' | '_'
export type StateName = 'scan' | 'carry' | 'halt'
export type Move = 'L' | 'R'

export interface Rule {
  state: StateName
  read: Cell
  write: Cell
  move: Move
  next: StateName
}

export interface Machine {
  tape: Cell[]
  head: number
  state: StateName
  steps: number
}

/** Six-rule binary incrementer. Blank is the end marker. */
export const RULES: readonly Rule[] = [
  { state: 'scan', read: '0', write: '0', move: 'R', next: 'scan' },
  { state: 'scan', read: '1', write: '1', move: 'R', next: 'scan' },
  { state: 'scan', read: '_', write: '_', move: 'L', next: 'carry' },
  { state: 'carry', read: '1', write: '0', move: 'L', next: 'carry' },
  { state: 'carry', read: '0', write: '1', move: 'L', next: 'halt' },
  { state: 'carry', read: '_', write: '1', move: 'L', next: 'halt' }
]

/** Tape `___1011_____` (11 in binary) with the head on the leading 1. */
export function initialMachine(): Machine {
  return {
    tape: ['_', '_', '_', '1', '0', '1', '1', '_', '_', '_', '_', '_'],
    head: 3,
    state: 'scan',
    steps: 0
  }
}

export function step(machine: Machine): Machine {
  if (machine.state === 'halt') return machine
  const symbol = machine.tape[machine.head]
  if (symbol === undefined) return machine
  const rule = RULES.find((item) => item.state === machine.state && item.read === symbol)
  if (!rule) return machine
  const tape = machine.tape.slice()
  tape[machine.head] = rule.write
  const delta = rule.move === 'R' ? 1 : -1
  const head = Math.max(0, Math.min(tape.length - 1, machine.head + delta))
  return { tape, head, state: rule.next, steps: machine.steps + 1 }
}

export function runUntilHalt(machine: Machine): Machine {
  let current = machine
  for (let i = 0; i < 1000 && current.state !== 'halt'; i += 1) {
    current = step(current)
  }
  return current
}

/** Significant bits, blanks stripped. Halted incrementer reads `1100` (12). */
export function tapeReading(tape: readonly Cell[]): string {
  return tape.join('').replace(/_/g, ' ').trim()
}

export function activeRule(machine: Machine): Rule | undefined {
  if (machine.state === 'halt') return undefined
  const symbol = machine.tape[machine.head]
  if (symbol === undefined) return undefined
  return RULES.find((item) => item.state === machine.state && item.read === symbol)
}
