import { describe, expect, it } from 'vitest'
import * as narrate from './index'

describe('@museum/narrate', () => {
  it('exports the pipeline functions', () => {
    expect(typeof narrate.narrateExhibit).toBe('function')
    expect(typeof narrate.narrationHash).toBe('function')
    expect(typeof narrate.applyPronunciation).toBe('function')
    expect(typeof narrate.charactersToWords).toBe('function')
    expect(typeof narrate.synthesize).toBe('function')
  })
})
