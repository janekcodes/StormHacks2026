import { describe, expect, it } from 'vitest'
import { validateToolCall } from './validate'

const built = new Set(['B3'])

describe('validateToolCall', () => {
  it('accepts a valid walkTo call', () => {
    const result = validateToolCall({ name: 'walkTo', args: { exhibitId: 'B3' } })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.call.name).toBe('walkTo')
  })

  it('rejects an unknown tool name', () => {
    const result = validateToolCall({ name: 'flyTo', args: {} })
    expect(result.ok).toBe(false)
  })

  it('rejects a non-object call', () => {
    expect(validateToolCall('nope').ok).toBe(false)
    expect(validateToolCall(null).ok).toBe(false)
  })

  it('rejects a walkTo with an unknown exhibit id', () => {
    const result = validateToolCall({ name: 'walkTo', args: { exhibitId: 'Z9' } })
    expect(result.ok).toBe(false)
  })

  it('rejects a walkTo with a missing exhibit id', () => {
    const result = validateToolCall({ name: 'walkTo', args: {} })
    expect(result.ok).toBe(false)
  })

  it('rejects openPortal on a planned exhibit when builtIds is provided', () => {
    const result = validateToolCall(
      { name: 'openPortal', args: { exhibitId: 'B4' } },
      { builtIds: built }
    )
    expect(result.ok).toBe(false)
  })

  it('accepts openPortal on a built exhibit', () => {
    const result = validateToolCall(
      { name: 'openPortal', args: { exhibitId: 'B3' } },
      { builtIds: built }
    )
    expect(result.ok).toBe(true)
  })

  it('rejects a startTour with fewer than 2 stops', () => {
    const result = validateToolCall({
      name: 'startTour',
      args: { title: 'AI', exhibitIds: ['F2'] }
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a startTour with more than 8 stops', () => {
    const result = validateToolCall({
      name: 'startTour',
      args: { title: 'Too long', exhibitIds: ['A1', 'B2', 'B3', 'C1', 'C3', 'D6', 'D7', 'F2', 'F7'] }
    })
    expect(result.ok).toBe(false)
  })

  it('accepts a valid startTour', () => {
    const result = validateToolCall({
      name: 'startTour',
      args: { title: 'AI and hardware', exhibitIds: ['B2', 'B3', 'F2', 'F7'] }
    })
    expect(result.ok).toBe(true)
  })

  it('accepts a highlight of valid ids', () => {
    const result = validateToolCall({
      name: 'highlight',
      args: { exhibitIds: ['B2', 'F2'] }
    })
    expect(result.ok).toBe(true)
  })

  it('accepts getVisitorContext with no args', () => {
    const result = validateToolCall({ name: 'getVisitorContext', args: {} })
    expect(result.ok).toBe(true)
  })
})
