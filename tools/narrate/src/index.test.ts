import { describe, expect, it } from 'vitest'
import { toolName } from './index'

describe('@museum/narrate', () => {
  it('is wired up', () => {
    expect(toolName).toBe('@museum/narrate')
  })
})
