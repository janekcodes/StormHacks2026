import { describe, expect, it } from 'vitest'
import { toolName } from './index'

describe('@museum/plan', () => {
  it('is wired up', () => {
    expect(toolName).toBe('@museum/plan')
  })
})
