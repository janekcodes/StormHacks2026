import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { cardLine, columnRows, rowsFor } from '../src/logic'

/**
 * Column-by-column row sets for `ISUM = ISUM + I`.
 * Columns are 1-based. Columns 1 to 6 are blank. The statement occupies 7 to 21.
 * Columns 73 to 80 are the id `MUSEUM01`.
 */
const ISUM_ROWS: Record<number, readonly string[]> = {
  7: ['12', '9'],
  8: ['0', '2'],
  9: ['0', '4'],
  10: ['11', '4'],
  11: [],
  12: ['6', '8'],
  13: [],
  14: ['12', '9'],
  15: ['0', '2'],
  16: ['0', '4'],
  17: ['11', '4'],
  18: [],
  19: ['12', '6', '8'],
  20: [],
  21: ['12', '9'],
  73: ['11', '4'],
  74: ['0', '4'],
  75: ['0', '2'],
  76: ['12', '5'],
  77: ['0', '4'],
  78: ['11', '4'],
  79: ['0'],
  80: ['1']
}

describe('C3 Hollerith card', () => {
  it('encodes ISUM = ISUM + I column by column to the expected row sets', () => {
    const line = cardLine({ label: '', statement: 'ISUM = ISUM + I' })
    expect(line.slice(0, 6)).toBe('      ')
    expect(line.slice(6, 21)).toBe('ISUM = ISUM + I')
    expect(line.slice(72)).toBe('MUSEUM01')
    const rows = columnRows(line)
    for (let column = 1; column <= 80; column += 1) {
      const expected = ISUM_ROWS[column] ?? []
      expect(rows[column - 1], `column ${column}`).toEqual(expected)
    }
    expect(rowsFor('=')).toEqual(['6', '8'])
    expect(rowsFor('+')).toEqual(['12', '6', '8'])
    expect(rowsFor(',')).toEqual(['0', '3', '8'])
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'C3')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
