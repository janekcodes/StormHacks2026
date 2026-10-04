import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { estimateSpeechMs, TourSchema, type TourLine } from '@museum/content/tour-schema'
import { exhibitStandPoint, setStandpoints, type StandpointsData } from '../nav/targets'
import { TRAVEL_SPEED_M_S } from '../nav/travel'
import { disposeNav, findPath, loadNavMesh } from '../nav/useNav'
import { MISSING_CLIP_MS, PLAY_MS } from './machine'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const tour = TourSchema.parse(JSON.parse(read('packages/content/data/tour.json')))
const standpoints = JSON.parse(read('packages/content/generated/standpoints.json')) as StandpointsData

const lineMs = (line: TourLine) => (line.audio && line.durationMs ? line.durationMs : estimateSpeechMs(line.text))

const BUDGET_MS = 165_000

const exhibitAudio = new Map(
  (JSON.parse(read('packages/content/data/exhibits.json')) as { exhibits: Array<{ id: string; audio?: { align: string } }> }).exhibits.map(
    (exhibit) => [exhibit.id, exhibit.audio?.align] as const
  )
)

/** Length of an exhibit's own narration: the last word's endMs in its align file. */
function narrationMs(id: string): number {
  const align = exhibitAudio.get(id)
  if (!align || !existsSync(join(root, 'apps/web/public', align))) return MISSING_CLIP_MS
  const { words } = JSON.parse(read(`apps/web/public${align}`)) as { words: Array<{ endMs: number }> }
  return words.at(-1)?.endMs ?? MISSING_CLIP_MS
}

describe('tour timing budget', () => {
  beforeAll(async () => {
    await loadNavMesh(readFileSync(join(root, 'packages/content/generated/navmesh.bin')))
    setStandpoints(standpoints)
  })
  afterAll(() => disposeNav())

  it('fits in 2:45 with Auto on: narration and play time at every stop', () => {
    let total = lineMs(tour.intro)
    let from = { x: 0, z: 20.7 } // foyer start, see player/usePlayer.ts
    for (const stop of tour.stops) {
      const stand = exhibitStandPoint(stop.exhibitId)
      expect(stand, `standpoint for ${stop.exhibitId}`).toBeTruthy()
      const path = findPath(from, { x: stand!.x, z: stand!.z })
      expect(path, `path to ${stop.exhibitId}`).toBeTruthy()
      const walkMs = (path!.length / TRAVEL_SPEED_M_S) * 1000
      total += Math.max(walkMs, lineMs(stop.bridge)) + narrationMs(stop.exhibitId) + PLAY_MS
      from = { x: stand!.x, z: stand!.z }
    }
    total += lineMs(tour.outro)
    console.log(`tour estimate: ${(total / 1000).toFixed(1)} s`)
    expect(total).toBeLessThanOrEqual(BUDGET_MS)
  })
})
