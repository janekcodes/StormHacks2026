import { describe, expect, it } from 'vitest'
import { sentenceIndexes } from './Narrator'

const w = (...texts: string[]) => texts.map((text) => ({ text }))

describe('sentenceIndexes', () => {
  it('starts a new sentence after . ? or !', () => {
    expect(sentenceIndexes(w('ENIAC', 'ran.', 'Did', 'it?', 'Yes!', 'Done'))).toEqual([0, 0, 1, 1, 2, 3])
  })

  it('treats closing quotes and brackets after the stop as part of the sentence', () => {
    expect(sentenceIndexes(w('He', 'said', '"hello."', 'Then', '(left.)', 'Next'))).toEqual([0, 0, 0, 1, 1, 2])
  })

  it('does not split on decimals or mid-word dots', () => {
    expect(sentenceIndexes(w('About', '1.7', 'm', 'tall.'))).toEqual([0, 0, 0, 0])
  })
})
