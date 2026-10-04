export const SIZE = 4
export const DONE_AT = 10

export const A: readonly (readonly number[])[] = [
  [1, 2, 0, 1],
  [0, 1, 3, 2],
  [2, 0, 1, 1],
  [1, 1, 1, 0]
]

export const B: readonly (readonly number[])[] = [
  [2, 0, 1, 1],
  [1, 3, 0, 2],
  [0, 1, 2, 1],
  [1, 0, 1, 3]
]

export interface Cell {
  value: number
  active: boolean
  done: boolean
}

export interface Systolic {
  t: number
  macs: number
  matrix: number[][]
  cells: Cell[][]
  leftFeed: string[]
  topFeed: string[]
}

/**
 * Cell (i, j) holds Σ A[i][k]·B[k][j] for every k with i+j+k < t.
 * The wavefront k where i+j+k = t-1 is the active pulse.
 */
export function systolicAt(t: number): Systolic {
  let macs = 0
  const matrix: number[][] = []
  const cells: Cell[][] = []
  const leftFeed: string[] = []
  for (let i = 0; i < SIZE; i += 1) {
    const rowValues: number[] = []
    const rowCells: Cell[] = []
    for (let j = 0; j < SIZE; j += 1) {
      const aRow = A[i]
      const bCol = B
      let acc = 0
      let active = false
      let done = 0
      for (let k = 0; k < SIZE; k += 1) {
        if (i + j + k < t) {
          const a = aRow?.[k] ?? 0
          const b = bCol[k]?.[j] ?? 0
          acc += a * b
          macs += 1
          done += 1
        }
        if (i + j + k === t - 1) active = true
      }
      rowValues.push(acc)
      rowCells.push({ value: acc, active, done: done === SIZE })
    }
    matrix.push(rowValues)
    cells.push(rowCells)
    const ka = t - 1 - i
    const aRow = A[i]
    leftFeed.push(ka >= 0 && ka < SIZE ? `a${i}${ka}=${aRow?.[ka] ?? 0}` : '')
  }
  const topFeed: string[] = []
  for (let j = 0; j < SIZE; j += 1) {
    const kb = t - 1 - j
    topFeed.push(kb >= 0 && kb < SIZE ? `b${kb}${j}=${B[kb]?.[j] ?? 0}` : '')
  }
  return { t, macs, matrix, cells, leftFeed, topFeed }
}
