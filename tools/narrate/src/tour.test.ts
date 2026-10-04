import { describe, expect, it } from 'vitest'
import type { Tour } from '@museum/content'
import { tourNarrationTargets } from './tour'

const tour: Tour = {
  id: 'demo',
  title: 'Demo',
  intro: { text: 'Hi.' },
  stops: [
    { exhibitId: 'A1', bridge: { text: 'One.' }, line: { text: 'Uno.' } },
    { exhibitId: 'B2', bridge: { text: 'Two.' }, line: { text: 'Dos.' } }
  ],
  outro: { text: 'Bye.' },
  fallback: { text: 'Sorry.' }
}

describe('tourNarrationTargets', () => {
  it('lists every line with a stable id that does not depend on stop order', () => {
    const targets = tourNarrationTargets(tour)
    expect(targets.map((target) => target.id)).toEqual([
      'tour-demo-intro',
      'tour-demo-A1',
      'tour-demo-A1-stop',
      'tour-demo-B2',
      'tour-demo-B2-stop',
      'tour-demo-outro',
      'tour-demo-fallback'
    ])
    expect(targets[1]!.line).toBe(tour.stops[0]!.bridge)
    expect(targets[2]!.line).toBe(tour.stops[0]!.line)
  })
})
