import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { systolicAt } from '../src/logic'

describe('B11 systolic array', () => {
  it('final matrix is the product with 64 MACs at t = 10', () => {
    const done = systolicAt(10)
    expect(done.matrix).toEqual([
      [5, 6, 2, 8],
      [3, 6, 8, 11],
      [5, 1, 5, 6],
      [3, 4, 3, 4]
    ])
    expect(done.macs).toBe(64)
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'B11')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
