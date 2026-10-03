import { describe, expect, it } from 'vitest'
import { packageName } from './index'

describe('@museum/guide', () => {
  it('is wired up', () => {
    expect(packageName).toBe('@museum/guide')
  })
})
