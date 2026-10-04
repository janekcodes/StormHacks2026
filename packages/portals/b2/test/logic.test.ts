import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { DOTS, INITIAL_DEAD, deadCount, powerCycle, replaceTube } from '../src/logic'

describe('B2 tube wall', () => {
  it('replaces a dead dot and leaves the others', () => {
    expect(replaceTube(INITIAL_DEAD, 158)).toEqual([37, 290])
    expect(replaceTube(INITIAL_DEAD, 0)).toEqual([37, 158, 290])
  })

  it('power-cycle picks 3 to 5 distinct dots', () => {
    expect(deadCount(0)).toBe(3)
    expect(deadCount(0.34)).toBe(4)
    expect(deadCount(0.99)).toBe(5)
    let n = 0
    const random = () => {
      n += 1
      return (n * 17) % 100 / 100
    }
    const dead = powerCycle(random)
    expect(dead.length).toBeGreaterThanOrEqual(3)
    expect(dead.length).toBeLessThanOrEqual(5)
    expect(new Set(dead).size).toBe(dead.length)
    for (const dot of dead) {
      expect(dot).toBeGreaterThanOrEqual(0)
      expect(dot).toBeLessThan(DOTS)
    }
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'B2')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
