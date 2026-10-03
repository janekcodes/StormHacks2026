import { describe, expect, it } from 'vitest'
import { packageName } from './index'

describe('@museum/scene', () => {
  it('is wired up', () => {
    expect(packageName).toBe('@museum/scene')
  })
})
