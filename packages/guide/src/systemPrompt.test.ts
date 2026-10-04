import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, type CompactExhibit } from './systemPrompt'

const exhibits: CompactExhibit[] = [
  { id: 'A1', year: '1936', title: "Turing's universal machine", zone: 'A', band: 'inner', tier: 'built' },
  { id: 'F10', year: '2017', title: 'The Transformer', zone: 'F', band: 'outer', tier: 'built' },
  { id: 'X2', year: 'next', title: 'Your future exhibit', zone: 'X', band: null, tier: 'open' }
]

describe('buildSystemPrompt', () => {
  it('includes the persona and every exhibit as a compact line', () => {
    const prompt = buildSystemPrompt(exhibits, '1.1')
    expect(prompt).toContain('AI guide of the NeXT-Gen Museum')
    expect(prompt).toContain('A1 | 1936 | Turing')
    expect(prompt).toContain('F10 | 2017 | The Transformer')
    expect(prompt).toContain('X2 | next | Your future exhibit | X | none | open')
    expect(prompt).toContain('| built')
  })

  it('is deterministic', () => {
    expect(buildSystemPrompt(exhibits, '1.1')).toBe(buildSystemPrompt(exhibits, '1.1'))
  })
})
