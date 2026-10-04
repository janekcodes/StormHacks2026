import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { lampOn } from '../src/logic'

describe('B3 transistor switch', () => {
  it('lamp is on iff the base is on', () => {
    expect(lampOn(true)).toBe(true)
    expect(lampOn(false)).toBe(false)
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'B3')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
