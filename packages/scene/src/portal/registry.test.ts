import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { portalLoaders } from './registry'

interface RawExhibit {
  id: string
  tier: string
  portal?: { package: string }
}

const exhibits = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../../packages/content/data/exhibits.json', import.meta.url)),
    'utf8'
  )
).exhibits as RawExhibit[]

describe('portal registry', () => {
  it('lazy-loads only built exhibits, one package per id', () => {
    const built = exhibits.filter((exhibit) => exhibit.tier === 'built')
    expect(built).toHaveLength(13)
    for (const exhibit of built) {
      expect(portalLoaders[exhibit.id as keyof typeof portalLoaders]).toEqual(expect.any(Function))
      expect(exhibit.portal?.package).toBe(`@museum/portal-${exhibit.id.toLowerCase()}`)
    }
    for (const exhibit of exhibits) {
      if (exhibit.tier === 'built') continue
      expect(portalLoaders[exhibit.id as keyof typeof portalLoaders]).toBeUndefined()
    }
  })
})
