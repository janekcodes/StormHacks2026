import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ExhibitsFileSchema, type Exhibit, type ExhibitId } from './schema'

const exhibitsPath = fileURLToPath(new URL('../data/exhibits.json', import.meta.url))
const parsed = ExhibitsFileSchema.parse(JSON.parse(readFileSync(exhibitsPath, 'utf8')))

export const scopeVersion: string = parsed.scopeVersion
export const exhibits: readonly Exhibit[] = parsed.exhibits

const byId = new Map<string, Exhibit>(parsed.exhibits.map((exhibit) => [exhibit.id, exhibit]))

export function getExhibit(id: ExhibitId): Exhibit | undefined {
  return byId.get(id)
}

export function exhibitsByZone(zone: string): Exhibit[] {
  return parsed.exhibits.filter((exhibit) => exhibit.zone === zone)
}

export function isExhibitId(value: string): value is ExhibitId {
  return byId.has(value as ExhibitId)
}
