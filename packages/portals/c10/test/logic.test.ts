import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { FIRST_PAGE_SQUARES, JS_SQUARES, litSquares } from '../src/logic'

describe('C10 waffle', () => {
  it('shows 632 squares for median JS and 2 for the first page', () => {
    expect(JS_SQUARES).toBe(632)
    expect(FIRST_PAGE_SQUARES).toBe(2)
    expect(litSquares('js')).toBe(632)
    expect(litSquares('first')).toBe(2)
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'C10')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
