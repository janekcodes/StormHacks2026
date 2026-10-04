import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import { program } from '../src/logic'

describe('C1 plugboard', () => {
  it('program A adds and program B multiplies', () => {
    const add = program('A')
    const mul = program('B')
    expect(add.listing).toContain('ADD   ACC2')
    expect(add.routes).toEqual([
      { from: 'ACC1', to: 'ACC3' },
      { from: 'ACC2', to: 'ACC3' },
      { from: 'ACC3', to: 'PRINT' }
    ])
    expect(mul.listing).toContain('MUL   ACC2')
    expect(mul.routes.map((route) => route.to)).toEqual(['MULT', 'MULT', 'ACC4', 'PRINT'])
  })

  it('takes title and year from content', () => {
    const row = file.exhibits.find((item) => item.id === 'C1')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
