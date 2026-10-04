import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { exhibits } from '../src/index'
import { checkTour, TourSchema, type Tour } from '../src/tour-schema'

const tourPath = fileURLToPath(new URL('../data/tour.json', import.meta.url))
const tour = TourSchema.parse(JSON.parse(readFileSync(tourPath, 'utf8')))

function line(text: string) {
  return { text }
}

function minimal(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 't',
    title: 'T',
    intro: line('Hello.'),
    stops: [{ exhibitId: 'A1', bridge: line('First stop.') }],
    outro: line('Bye.'),
    fallback: line('Let us keep walking.'),
    ...overrides
  } as Tour
}

describe('tour.json', () => {
  it('is the six stop demo route in order', () => {
    expect(tour.id).toBe('demo')
    expect(tour.stops.map((stop) => stop.exhibitId)).toEqual(['A1', 'B2', 'C3', 'E3', 'D7', 'F10'])
  })

  it('passes every content rule', () => {
    expect(checkTour(tour, exhibits)).toEqual([])
  })
})

describe('checkTour', () => {
  it('rejects a stop that is not a built exhibit', () => {
    const errors = checkTour(minimal({ stops: [{ exhibitId: 'A2', bridge: line('x') }] } as Partial<Tour>), exhibits)
    expect(errors.join('\n')).toContain('A2 is not a built exhibit')
  })

  it('rejects em and en dashes in any line', () => {
    const errors = checkTour(minimal({ intro: line('Hello — there'), outro: line('1936 – 1969') }), exhibits)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('intro')
    expect(errors[1]).toContain('outro')
  })

  it('rejects duplicate stops', () => {
    const errors = checkTour(
      minimal({
        stops: [
          { exhibitId: 'A1', bridge: line('a') },
          { exhibitId: 'A1', bridge: line('b') }
        ]
      } as Partial<Tour>),
      exhibits
    )
    expect(errors.join('\n')).toContain('A1 appears twice')
  })
})
