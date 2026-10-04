import { describe, expect, it } from 'vitest'
import { parseAlignment } from './alignment'

describe('parseAlignment', () => {
  it('parses a valid alignment file', () => {
    const result = parseAlignment({
      words: [
        { text: 'ENIAC', startMs: 0, endMs: 520 },
        { text: 'was', startMs: 520, endMs: 700 }
      ]
    })
    expect(result.words).toHaveLength(2)
    expect(result.words[0]).toEqual({ text: 'ENIAC', startMs: 0, endMs: 520 })
  })

  it('rejects a file without words', () => {
    expect(() => parseAlignment({})).toThrow(/words missing/)
    expect(() => parseAlignment(null)).toThrow(/invalid alignment/)
  })

  it('rejects words with missing timings', () => {
    expect(() => parseAlignment({ words: [{ text: 'a' }] })).toThrow(/timings/)
  })
})
