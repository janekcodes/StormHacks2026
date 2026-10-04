import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { initialMachine, runUntilHalt, tapeReading } from '../src/logic'

describe('A1 binary incrementer', () => {
  it('ends in state halt with tape reading 1100', () => {
    const done = runUntilHalt(initialMachine())
    expect(done.state).toBe('halt')
    expect(tapeReading(done.tape)).toBe('1100')
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'A1')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
    expect(meta.id).toBe('A1')
  })
})
