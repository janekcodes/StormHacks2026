import { describe, expect, it } from 'vitest'
import { packageName } from './index'

describe('@museum/content', () => {
  it('is wired up', () => {
    expect(packageName).toBe('@museum/content')
  })
})
