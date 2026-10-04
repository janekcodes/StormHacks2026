import type { ExhibitId } from '@museum/content/schema'

export interface NavTarget {
  x: number
  z: number
  yaw: number
}

export interface StandpointsData {
  exhibits: Record<string, NavTarget>
  rooms: Record<string, NavTarget>
}

let data: StandpointsData | null = null

export function setStandpoints(next: StandpointsData): void {
  data = next
}

export function getStandpoints(): StandpointsData | null {
  return data
}

export function exhibitStandPoint(id: ExhibitId | string): NavTarget | null {
  return data?.exhibits[id] ?? null
}

export function roomTarget(key: string): NavTarget | null {
  return data?.rooms[key] ?? null
}

export const ROOM_JUMP_ORDER = [
  'Foyer',
  'Atr',
  'A',
  'B',
  'C',
  'E',
  'D',
  'F',
  'Sx',
  'G',
  'X',
  'Shop',
  'Conc'
] as const

export function roomJumpLabel(key: string): string {
  switch (key) {
    case 'Foyer':
      return 'Foyer'
    case 'Atr':
      return 'Atrium'
    case 'Conc':
      return 'Concourse'
    case 'Sx':
      return 'Society'
    case 'G':
      return 'People'
    case 'Shop':
      return 'Shop'
    case 'X':
      return 'Future'
    default:
      return `Wing ${key}`
  }
}
