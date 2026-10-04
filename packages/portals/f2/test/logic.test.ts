import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { PROPOSERS, PROVED_LIMIT, THEOREM_COUNT, nextProved } from '../src/logic'

describe('F2 Dartmouth', () => {
  it('stops the Logic Theorist counter at 38 of 52', () => {
    let proved = 0
    for (let i = 0; i < 80; i += 1) proved = nextProved(proved)
    expect(proved).toBe(PROVED_LIMIT)
    expect(PROVED_LIMIT).toBe(38)
    expect(THEOREM_COUNT).toBe(52)
    expect(nextProved(38)).toBe(38)
  })

  it('names four proposers', () => {
    expect(PROPOSERS.map((person) => person.name)).toEqual([
      'McCarthy',
      'Minsky',
      'Rochester',
      'Shannon'
    ])
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'F2')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
