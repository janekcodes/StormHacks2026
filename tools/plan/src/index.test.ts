import { describe, expect, it } from 'vitest'
import { generate, renderSvg } from './index'

describe('@museum/plan', () => {
  it('exports the generator and the SVG renderer', () => {
    expect(typeof generate).toBe('function')
    expect(typeof renderSvg).toBe('function')
  })
})
