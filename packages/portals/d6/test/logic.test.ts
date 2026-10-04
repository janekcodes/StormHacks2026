import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { MEDIAN_PAGE_SECONDS, transferSeconds } from '../src/logic'

describe('D6 modem race', () => {
  it('large page time is 1,422 s ± 1', () => {
    expect(Math.abs(MEDIAN_PAGE_SECONDS - 1422)).toBeLessThanOrEqual(1)
    expect(transferSeconds(2_560_000, 14_400)).toBeCloseTo(1422.222, 2)
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'D6')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
