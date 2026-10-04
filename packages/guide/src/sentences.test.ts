import { describe, expect, it } from 'vitest'
import { createSentenceSplitter, splitSentences } from './sentences'

describe('splitSentences', () => {
  it('splits on periods', () => {
    expect(splitSentences('The transistor is in wing B. It switched in 1947.')).toEqual([
      'The transistor is in wing B.',
      'It switched in 1947.'
    ])
  })

  it('splits on question and exclamation marks', () => {
    expect(splitSentences('Is the Turing test on display? No!')).toEqual([
      'Is the Turing test on display?',
      'No!'
    ])
  })

  it('does not split decimals', () => {
    expect(splitSentences('The page is 2.56 MB. It has 75 requests.')).toEqual([
      'The page is 2.56 MB.',
      'It has 75 requests.'
    ])
  })

  it('does not split a trailing decimal unit', () => {
    expect(splitSentences('It runs at 1.5 gigahertz.')).toEqual(['It runs at 1.5 gigahertz.'])
  })

  it('does not split the circa abbreviation', () => {
    expect(splitSentences('Al-Khwarizmi worked c. 820. He wrote on algorithms.')).toEqual([
      'Al-Khwarizmi worked c. 820.',
      'He wrote on algorithms.'
    ])
  })

  it('does not split e.g. or i.e.', () => {
    expect(splitSentences('Many machines, e.g. ENIAC, were huge.')).toEqual([
      'Many machines, e.g. ENIAC, were huge.'
    ])
    expect(splitSentences('One idea, i.e. the stored program, changed computing.')).toEqual([
      'One idea, i.e. the stored program, changed computing.'
    ])
  })

  it('keeps exhibit IDs intact as sentence ends', () => {
    expect(splitSentences('See B4. The Manchester Baby stored a program.')).toEqual([
      'See B4.',
      'The Manchester Baby stored a program.'
    ])
    expect(splitSentences('See B4 and C10. Both are exhibits.')).toEqual([
      'See B4 and C10.',
      'Both are exhibits.'
    ])
  })

  it('handles quoted sentences', () => {
    expect(splitSentences('He said "hello." Then he left.')).toEqual([
      'He said "hello."',
      'Then he left.'
    ])
  })
})

describe('createSentenceSplitter (incremental)', () => {
  it('emits sentences as they complete across chunks', () => {
    const splitter = createSentenceSplitter()
    expect(splitter.push('The transistor is in wing')).toEqual([])
    expect(splitter.push(' B. It switched in 1947.')).toEqual(['The transistor is in wing B.'])
    // The trailing sentence waits for more text (it could be "1947.5"); flush emits it.
    expect(splitter.flush()).toEqual(['It switched in 1947.'])
  })

  it('holds a trailing abbreviation until more text arrives', () => {
    const splitter = createSentenceSplitter()
    expect(splitter.push('Al-Khwarizmi worked c.')).toEqual([])
    expect(splitter.push(' 820.')).toEqual([])
    expect(splitter.flush()).toEqual(['Al-Khwarizmi worked c. 820.'])
  })

  it('flushes remaining text as a final sentence', () => {
    const splitter = createSentenceSplitter()
    splitter.push('See B4')
    expect(splitter.flush()).toEqual(['See B4'])
  })

  it('reset clears the buffer', () => {
    const splitter = createSentenceSplitter()
    splitter.push('See B4')
    splitter.reset()
    expect(splitter.flush()).toEqual([])
  })

  it('does not split a decimal when the digits arrive in a later chunk', () => {
    const splitter = createSentenceSplitter()
    expect(splitter.push('It was 2.')).toEqual([])
    expect(splitter.push('56 MB long. ')).toEqual(['It was 2.56 MB long.'])
  })

  it('does not split an initialism across chunks', () => {
    const splitter = createSentenceSplitter()
    expect(splitter.push('Made in the U.')).toEqual([])
    expect(splitter.push('S. is a fact. ')).toEqual(['Made in the U.S. is a fact.'])
  })

  it('end of buffer is not a boundary while streaming, flush emits it', () => {
    const splitter = createSentenceSplitter()
    expect(splitter.push('Done.')).toEqual([])
    expect(splitter.flush()).toEqual(['Done.'])
  })
})
