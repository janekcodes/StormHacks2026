import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { ATTENTION, NEXT_STEPS, rowSum, sampleNext } from '../src/logic'

describe('F10 attention', () => {
  it('every row sums to 1 ± 0.001', () => {
    expect(ATTENTION).toHaveLength(8)
    for (const row of ATTENTION) {
      expect(row).toHaveLength(8)
      expect(Math.abs(rowSum(row) - 1)).toBeLessThanOrEqual(0.001)
    }
  })

  it('samples a next token across 4 steps', () => {
    expect(NEXT_STEPS).toHaveLength(4)
    const words = [0, 1, 2, 3].map((step) => sampleNext(step, 0))
    expect(words).toEqual(['station', 'just', 'in', 'time.'])
    expect(sampleNext(4, 0)).toBeUndefined()
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'F10')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
