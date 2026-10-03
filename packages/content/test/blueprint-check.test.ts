import { describe, expect, it } from 'vitest'
import {
  compareBlueprint,
  parseBlueprintTable,
  type BlueprintRow
} from '../src/blueprint-check'
import { exhibits } from '../src/index'

const FIXTURE = `## 6. Exhibit registry

The canonical list.

| ID  | Year       | Exhibit      | Zone             | Band  | Tier   | Portal |
| --- | ---------- | ------------ | ---------------- | ----- | ------ | ------ |
| B2  | 1945       | ENIAC        | Wing B           | Inner | Built  | Portal |
| C1  | 1945       | Patch cables | Wing C           | Inner | Built  | Portal |

## 7. Exhibit contract

| Part | Requirement |
| ---- | ----------- |
| X    | Y           |
`

describe('parseBlueprintTable', () => {
  it('parses exhibit rows and ignores later sections', () => {
    expect(parseBlueprintTable(FIXTURE)).toEqual([
      { id: 'B2', year: '1945', title: 'ENIAC', zone: 'B', band: 'inner', tier: 'built' },
      { id: 'C1', year: '1945', title: 'Patch cables', zone: 'C', band: 'inner', tier: 'built' }
    ])
  })
})

describe('compareBlueprint', () => {
  const b2 = exhibits.find((exhibit) => exhibit.id === 'B2')
  if (!b2) throw new Error('fixture exhibit B2 missing from data')

  const matchingRow: BlueprintRow = {
    id: 'B2',
    year: '1945',
    title: 'ENIAC',
    zone: 'B',
    band: 'inner',
    tier: 'built'
  }

  it('returns no diffs when data matches', () => {
    expect(compareBlueprint([matchingRow], [b2])).toEqual([])
  })

  it('reports a title diff when the data title changes', () => {
    const changed = { ...b2, title: 'WRONG TITLE' }
    expect(compareBlueprint([matchingRow], [changed])).toContainEqual({
      id: 'B2',
      field: 'title',
      blueprint: 'ENIAC',
      exhibits: 'WRONG TITLE'
    })
  })

  it('reports a title diff when the blueprint title changes', () => {
    const changedRow = { ...matchingRow, title: 'WRONG TITLE' }
    expect(compareBlueprint([changedRow], [b2])).toContainEqual({
      id: 'B2',
      field: 'title',
      blueprint: 'WRONG TITLE',
      exhibits: 'ENIAC'
    })
  })

  it('reports a missing exhibit', () => {
    expect(compareBlueprint([matchingRow], [])).toContainEqual({
      id: 'B2',
      field: 'title',
      blueprint: 'ENIAC',
      exhibits: '<missing>'
    })
  })

  it('reports an exhibit not present in the blueprint', () => {
    expect(compareBlueprint([], [b2])).toContainEqual({
      id: 'B2',
      field: 'title',
      blueprint: '<missing>',
      exhibits: 'ENIAC'
    })
  })
})
