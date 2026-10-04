import buildingFile from '@museum/content/generated/building.json'
import standpointsFile from '@museum/content/generated/standpoints.json'
import exhibitsFile from '@museum/content/data/exhibits.json'
import tourFile from '@museum/content/data/tour.json'
import { BuildingSchema, type Building } from '@museum/content/plan-schema'
import { TourSchema, type Tour } from '@museum/content/tour-schema'
import {
  ExhibitsFileSchema,
  type Exhibit,
  type ExhibitId
} from '@museum/content/schema'

export type Standpoint = { x: number; z: number; yaw: number }
export type StandpointsData = {
  exhibits: Record<string, Standpoint>
  rooms: Record<string, Standpoint>
}

const parsed = ExhibitsFileSchema.parse(exhibitsFile)

export const building: Building = BuildingSchema.parse(buildingFile)
export const scopeVersion: string = parsed.scopeVersion
export const exhibits: readonly Exhibit[] = parsed.exhibits
export const standpoints: StandpointsData = standpointsFile as StandpointsData
export const tour: Tour = TourSchema.parse(tourFile)

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

export type { Building, Exhibit, ExhibitId }
