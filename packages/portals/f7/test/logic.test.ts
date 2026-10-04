import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import {
  DEEP_BLUE_PER_S,
  DEEP_THOUGHT_PER_S,
  formatDuration,
  positions,
  searchSeconds
} from '../src/logic'

describe('F7 search tree', () => {
  it('positions are 35^d for d in 1..12', () => {
    for (let depth = 1; depth <= 12; depth += 1) {
      expect(positions(depth)).toBe(35 ** depth)
    }
  })

  it('times the tree at 700,000/s and 200,000,000/s', () => {
    expect(searchSeconds(4, DEEP_THOUGHT_PER_S)).toBe(positions(4) / 700_000)
    expect(searchSeconds(4, DEEP_BLUE_PER_S)).toBe(positions(4) / 200_000_000)
    expect(formatDuration(0.5)).toBe('500 ms')
    expect(formatDuration(90)).toBe('1.5 min')
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'F7')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
