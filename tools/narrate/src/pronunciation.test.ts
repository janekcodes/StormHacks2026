import { describe, expect, it } from 'vitest'
import { applyPronunciation, type PronunciationDictionary } from './pronunciation'

const dict: PronunciationDictionary = {
  ENIAC: 'EE-nee-ack',
  Shor: 'shore'
}

describe('applyPronunciation', () => {
  it('replaces canonical names case-insensitively', () => {
    expect(applyPronunciation('ENIAC was built', dict)).toBe('EE-nee-ack was built')
    expect(applyPronunciation('eniac was built', dict)).toBe('EE-nee-ack was built')
  })

  it('respects word boundaries', () => {
    expect(applyPronunciation('Shor is short', dict)).toBe('shore is short')
  })

  it('preserves word count', () => {
    const text = 'ENIAC was first and Shor came later'
    const out = applyPronunciation(text, dict)
    expect(out.split(/\s+/)).toHaveLength(text.split(/\s+/).length)
  })

  it('leaves unknown words unchanged', () => {
    expect(applyPronunciation('hello world', dict)).toBe('hello world')
  })
})
