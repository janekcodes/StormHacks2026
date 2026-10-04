'use client'

import type { Building } from '@museum/content/plan-schema'
import type { ExhibitId } from '@museum/content/schema'
import { roomAt } from '../rooms'
import { exhibitStandPoint, roomTarget } from './targets'
import { travelTo, cancelTravel, type TravelOptions } from './travel'
import { findWalkableNavPoint } from './useNav'

export interface MuseumNavApi {
  walkTo: (id: ExhibitId | string, options?: TravelOptions) => boolean
  goRoom: (key: string, options?: TravelOptions) => boolean
  travelTo: (target: { x: number; z: number }, options?: TravelOptions) => boolean
  goMapPoint: (x: number, z: number, building?: Building) => boolean
  cancelTravel: () => void
}

let mapBuilding: Building | null = null

export function setMapBuilding(building: Building | null): void {
  mapBuilding = building
}

export const museum: MuseumNavApi = {
  walkTo(id, options = {}) {
    const sp = exhibitStandPoint(id)
    if (!sp) return false
    const opts: TravelOptions = {
      face: options.face ?? sp.yaw,
      pitch: options.pitch ?? -0.14
    }
    if (options.onArrive) opts.onArrive = options.onArrive
    if (options.onCancel) opts.onCancel = options.onCancel
    return travelTo({ x: sp.x, z: sp.z }, opts)
  },
  goRoom(key, options = {}) {
    const rt = roomTarget(key)
    if (!rt) return false
    const opts: TravelOptions = {
      face: options.face ?? rt.yaw,
      pitch: options.pitch ?? -0.03
    }
    if (options.onArrive) opts.onArrive = options.onArrive
    return travelTo({ x: rt.x, z: rt.z }, opts)
  },
  travelTo(target, options = {}) {
    return travelTo(target, options)
  },
  goMapPoint(x, z, building) {
    const b = building ?? mapBuilding
    // Outside the building or inside a wall footprint: do nothing.
    if (b && !roomAt(b, x, z)) return false
    const snapped = findWalkableNavPoint(x, z)
    if (!snapped) return false
    return travelTo(snapped)
  },
  cancelTravel
}

declare global {
  interface Window {
    museum?: MuseumNavApi
  }
}

export function bindMuseumApi(enabled: boolean): void {
  if (typeof window === 'undefined') return
  if (enabled) window.museum = museum
  else if (window.museum === museum) delete window.museum
}
