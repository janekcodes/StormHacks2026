import { describe, expect, it } from 'vitest'
import { charactersToWords } from './alignment'

describe('charactersToWords', () => {
  it('groups characters into words by whitespace', () => {
    const chars = ['H', 'i', ' ', 't', 'h', 'e', 'r', 'e']
    const times = [0, 1, 2, 3, 4, 5, 6, 7]
    const ends = [1, 2, 3, 4, 5, 6, 7, 8]
    const words = charactersToWords(chars, times, ends, ['Hi', 'there'])
    expect(words).toEqual([
      { text: 'Hi', startMs: 0, endMs: 2000 },
      { text: 'there', startMs: 3000, endMs: 8000 }
    ])
  })

  it('throws when the word counts do not match', () => {
    const chars = ['a', ' ', 'b']
    const times = [0, 1, 2]
    expect(() => charactersToWords(chars, times, times, ['one'])).toThrow(/word count/)
  })

  it('handles an empty source', () => {
    expect(charactersToWords([], [], [], [])).toEqual([])
  })
})
