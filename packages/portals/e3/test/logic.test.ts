import file from '@museum/content/data/exhibits.json'
import { describe, expect, it } from 'vitest'
import { meta } from '../src/index'
import {
  NOTES,
  PARTNER_LINE,
  START_NOTE,
  jump,
  linkIndexes,
  noteById,
  partnerText,
  pushVisit
} from '../src/logic'

describe('E3 Engelbart demo portal', () => {
  it('jumps from a link token to its target note', () => {
    const demo = noteById('demo')
    expect(demo).toBeDefined()
    expect(linkIndexes(demo as NonNullable<typeof demo>)).toEqual([8, 10, 13])
    expect(jump('demo', 8)).toBe('mouse')
    expect(jump('demo', 10)).toBe('windows')
    expect(jump('demo', 13)).toBe('collaboration')
    expect(jump('demo', 0)).toBeNull()
    expect(jump('missing', 0)).toBeNull()
  })

  it('keeps a browser-like visit stack', () => {
    expect(pushVisit(['demo'], 'mouse')).toEqual(['demo', 'mouse'])
    expect(pushVisit(['demo', 'mouse', 'windows'], 'demo')).toEqual(['demo'])
  })

  it('types the partner line over time', () => {
    expect(PARTNER_LINE).toBe('Hello from Menlo Park')
    expect(partnerText(0)).toBe('')
    expect(partnerText(5)).toBe('Hello')
    expect(partnerText(PARTNER_LINE.length + 3)).toBe(PARTNER_LINE)
  })

  it('starts on the demo note and takes title and year from content', () => {
    expect(NOTES[0]?.id).toBe(START_NOTE)
    const row = file.exhibits.find((item) => item.id === 'E3')
    expect(meta.title).toBe(row?.title)
    expect(meta.year).toBe(row?.year)
  })
})
