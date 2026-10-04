import type { ExhibitId } from '@museum/content/schema'
import { blocked, type Seg } from '../player/collision'

export const FOCUS_MAX_M = 4.6
export const FOCUS_MIN_COS = 0.82
export const CULL_M = 40
export const ANIM_M = 18
export const HOVER_MAX_M = 26

export interface FocusPoint {
  id: ExhibitId
  x: number
  z: number
}

/** Axis-aligned distance test used by the prototype (not a Euclidean radius). */
export function axisNear(ax: number, az: number, bx: number, bz: number, limit: number): boolean {
  return Math.abs(ax - bx) < limit && Math.abs(az - bz) < limit
}

/**
 * Nearest exhibit in front of the visitor: under 4.6 m and within a cone of cos 0.82.
 * Facing is -Z in local yaw, matching the player camera.
 */
export function bestFocus(
  px: number,
  pz: number,
  yaw: number,
  exhibits: readonly FocusPoint[]
): ExhibitId | null {
  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  let best: ExhibitId | null = null
  let bestDist = FOCUS_MAX_M
  for (const exhibit of exhibits) {
    const dx = exhibit.x - px
    const dz = exhibit.z - pz
    const dist = Math.hypot(dx, dz)
    if (dist < 1e-4 || dist >= bestDist) continue
    if ((dx * fx + dz * fz) / dist > FOCUS_MIN_COS) {
      bestDist = dist
      best = exhibit.id
    }
  }
  return best
}

/** True when the segment does not pass within wall clearance of a wall. */
export function lineClear(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  segs: readonly Seg[]
): boolean {
  const dist = Math.hypot(x1 - x0, z1 - z0)
  const steps = Math.max(1, Math.ceil(dist / 0.4))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    if (blocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, segs, [])) return false
  }
  return true
}

export function faceYaw(face: readonly [number, number]): number {
  return Math.atan2(face[0], face[1])
}
