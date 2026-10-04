export const TOKENS = ['The', 'train', 'stopped', 'because', 'it', 'was', 'running', 'late'] as const

/**
 * Illustrative 8x8 attention. Each row sums to 1.
 * These weights are not from a trained model.
 */
export const ATTENTION: readonly (readonly number[])[] = [
  [0.4, 0.3, 0.08, 0.04, 0.04, 0.04, 0.05, 0.05],
  [0.2, 0.45, 0.15, 0.03, 0.05, 0.04, 0.04, 0.04],
  [0.05, 0.35, 0.3, 0.05, 0.08, 0.05, 0.06, 0.06],
  [0.03, 0.1, 0.35, 0.25, 0.1, 0.07, 0.05, 0.05],
  [0.05, 0.55, 0.1, 0.06, 0.12, 0.05, 0.04, 0.03],
  [0.03, 0.15, 0.1, 0.07, 0.3, 0.25, 0.05, 0.05],
  [0.03, 0.2, 0.1, 0.05, 0.25, 0.12, 0.2, 0.05],
  [0.03, 0.2, 0.15, 0.05, 0.12, 0.15, 0.15, 0.15]
]

export function rowSum(row: readonly number[]): number {
  return row.reduce((sum, value) => sum + value, 0)
}

export interface Candidate {
  word: string
  p: number
}

/**
 * Four illustrative next-token steps.
 * Probabilities in a step do not all sum to 1. A draw past the last mass
 * selects the first candidate, matching the prototype sampler.
 */
export const NEXT_STEPS: readonly (readonly Candidate[])[] = [
  [
    { word: 'station', p: 0.58 },
    { word: 'platform', p: 0.21 },
    { word: 'gate', p: 0.09 },
    { word: 'museum', p: 0.05 },
    { word: 'future', p: 0.03 }
  ],
  [
    { word: 'just', p: 0.34 },
    { word: 'right', p: 0.22 },
    { word: 'as', p: 0.18 },
    { word: 'exactly', p: 0.1 },
    { word: 'with', p: 0.08 }
  ],
  [
    { word: 'in', p: 0.4 },
    { word: 'on', p: 0.3 },
    { word: 'before', p: 0.14 },
    { word: 'after', p: 0.09 },
    { word: 'at', p: 0.04 }
  ],
  [
    { word: 'time.', p: 0.66 },
    { word: 'schedule.', p: 0.18 },
    { word: 'cue.', p: 0.08 },
    { word: 'midnight.', p: 0.05 },
    { word: 'dawn.', p: 0.02 }
  ]
]

export function sampleNext(step: number, randomUnit: number): string | undefined {
  const candidates = NEXT_STEPS[step]
  if (!candidates || candidates.length === 0) return undefined
  const first = candidates[0]
  if (!first) return undefined
  let acc = 0
  for (const candidate of candidates) {
    acc += candidate.p
    if (randomUnit <= acc) return candidate.word
  }
  return first.word
}

export const PROMPT = 'The museum train arrived at the'
