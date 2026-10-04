import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { toggleMode, webStats } from '../src/logic'

describe('D7 web mode', () => {
  it('swaps the stat set between 2026 and 1991', () => {
    expect(toggleMode('2026')).toBe('1991')
    expect(toggleMode('1991')).toBe('2026')
    expect(webStats('1991')).toMatchObject({ weight: '~2 KB', requests: '1', js: '0 KB', css: 'none' })
    expect(webStats('2026')).toMatchObject({
      weight: '2.56 MB',
      requests: '75',
      js: '632 KB',
      css: 'yes'
    })
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'D7')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
