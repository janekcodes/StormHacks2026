export const PROVED_LIMIT = 38
export const THEOREM_COUNT = 52

export interface Proposer {
  initials: string
  name: string
  note: string
}

export const PROPOSERS: readonly Proposer[] = [
  {
    initials: 'JM',
    name: 'McCarthy',
    note: 'John McCarthy, Dartmouth. Coined "artificial intelligence" for the proposal; designed LISP two years later.'
  },
  {
    initials: 'MM',
    name: 'Minsky',
    note: 'Marvin Minsky, Harvard. Had built SNARC in 1951, an early neural-network learning machine made of tubes.'
  },
  {
    initials: 'NR',
    name: 'Rochester',
    note: 'Nathaniel Rochester, IBM. Chief designer of the IBM 701; simulated neural networks on it.'
  },
  {
    initials: 'CS',
    name: 'Shannon',
    note: 'Claude Shannon, Bell Labs. Founded information theory in 1948; in 1950 built Theseus, a maze-learning mechanical mouse.'
  }
]

/** Logic Theorist stops at 38 of 52. Further steps do not advance. */
export function nextProved(current: number): number {
  if (current >= PROVED_LIMIT) return current
  return current + 1
}
