import { describe, expect, it } from 'vitest'
import { narrationHash } from './hash'

const base = { narration: 'hello', voiceId: 'v', modelId: 'm', settings: '{}' }

describe('narrationHash', () => {
  it('is deterministic', () => {
    expect(narrationHash(base)).toBe(narrationHash(base))
  })

  it('is eight hex chars', () => {
    expect(narrationHash(base)).toMatch(/^[0-9a-f]{8}$/)
  })

  it('changes with each input', () => {
    const hash = narrationHash(base)
    expect(narrationHash({ ...base, narration: 'hello ' })).not.toBe(hash)
    expect(narrationHash({ ...base, voiceId: 'v2' })).not.toBe(hash)
    expect(narrationHash({ ...base, modelId: 'm2' })).not.toBe(hash)
    expect(narrationHash({ ...base, settings: '{"x":1}' })).not.toBe(hash)
  })
})
