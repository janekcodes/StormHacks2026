'use client'

import { useFrame } from '@react-three/fiber'
import { stopNarration } from '../audio/narratorBus'
import { usePlayer } from '../player/usePlayer'
import { prefersReducedMotion } from '../ui'
import { findPath, type NavPoint2 } from './useNav'

export const TRAVEL_SPEED_M_S = 8
export const FACE_BLEND_M = 1.5

export interface TravelOptions {
  face?: number
  pitch?: number
  onArrive?: () => void
}

interface TravelState {
  points: NavPoint2[]
  /** Distance along the polyline already covered. */
  done: number
  length: number
  face: number | null
  pitch: number | null
  startYaw: number
  onArrive: (() => void) | null
}

let travel: TravelState | null = null

const MOVE_CANCEL_KEYS = [
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'q',
  'vf',
  'vb',
  'vl',
  'vr'
] as const

function shortestYawDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

function easeYaw(current: number, target: number, amount: number): number {
  const dy = shortestYawDelta(current, target)
  // Smoothstep the blend amount for eased turning.
  const t = Math.max(0, Math.min(1, amount))
  const s = t * t * (3 - 2 * t)
  return current + dy * s
}

function pointAlong(points: NavPoint2[], distance: number): {
  x: number
  z: number
  segYaw: number
  remaining: number
} {
  if (points.length === 0) return { x: 0, z: 0, segYaw: 0, remaining: 0 }
  if (points.length === 1) {
    const p = points[0]!
    return { x: p.x, z: p.z, segYaw: 0, remaining: 0 }
  }
  let left = distance
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const seg = Math.hypot(b.x - a.x, b.z - a.z)
    if (left <= seg || i === points.length - 1) {
      const t = seg > 1e-9 ? Math.min(1, left / seg) : 1
      const yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z))
      let remaining = (1 - t) * seg
      for (let j = i + 1; j < points.length; j++) {
        const p0 = points[j - 1]!
        const p1 = points[j]!
        remaining += Math.hypot(p1.x - p0.x, p1.z - p0.z)
      }
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        segYaw: yaw,
        remaining
      }
    }
    left -= seg
  }
  const last = points[points.length - 1]!
  return { x: last.x, z: last.z, segYaw: 0, remaining: 0 }
}

export function isTravelling(): boolean {
  return travel !== null
}

export function cancelTravel(): void {
  travel = null
  // A cancelled walk-to never opens the portal, so drop its narration too.
  stopNarration()
}

/**
 * Pathfind and walk to a world target along the navmesh.
 * Any movement key cancels travel. With reduced motion the walk is a cut:
 * the next frame lands on the target.
 */
export function travelTo(
  target: { x: number; z: number },
  options: TravelOptions = {}
): boolean {
  const player = usePlayer.getState()
  const path = findPath({ x: player.x, z: player.z }, { x: target.x, z: target.z })
  if (!path || path.points.length === 0) {
    travel = null
    return false
  }
  // Ensure the exact target is the last point (snapped path may end nearby).
  const last = path.points[path.points.length - 1]!
  if (Math.hypot(last.x - target.x, last.z - target.z) > 0.05) {
    path.points.push({ x: target.x, z: target.z })
    path.length += Math.hypot(last.x - target.x, last.z - target.z)
  }
  player.clearKeys()
  travel = {
    points: path.points,
    done: prefersReducedMotion() ? path.length : 0,
    length: path.length,
    face: options.face ?? null,
    pitch: options.pitch ?? null,
    startYaw: player.yaw,
    onArrive: options.onArrive ?? null
  }
  return true
}

function movementKeyDown(keys: Record<string, boolean>): boolean {
  return MOVE_CANCEL_KEYS.some((k) => keys[k])
}

/** Drive automatic travel each frame. Mount inside the R3F Canvas. */
export function TravelDriver() {
  // Priority -1: update pose before Controls copies it onto the camera.
  useFrame((_, dt) => {
    // Cap each frame's simulated advance so a backgrounded tab (huge dt) does
    // not teleport the player across the map, but keep the cap wide enough
    // that auto-travel stays real-time at low frame rates. Software WebGL in
    // CI runs far below 20 FPS, so a 50ms cap would slow walks below real-time
    // and time out the e2e travel checks. A 500ms cap keeps travel real-time
    // down to 2 FPS while still bounding background-tab jumps to 4m.
    const clamped = Math.min(0.5, dt)
    const player = usePlayer.getState()

    if (!travel) return

    if (movementKeyDown(player.keys)) {
      cancelTravel()
      return
    }

    const T = travel
    T.done = Math.min(T.length, T.done + TRAVEL_SPEED_M_S * clamped)
    const along = pointAlong(T.points, T.done)

    let yaw = along.segYaw
    if (T.face !== null && along.remaining <= FACE_BLEND_M) {
      const blend = FACE_BLEND_M > 0 ? 1 - along.remaining / FACE_BLEND_M : 1
      yaw = easeYaw(along.segYaw, T.face, blend)
    } else if (T.done > 0.01) {
      // Ease heading toward the current segment direction while travelling.
      yaw = easeYaw(player.yaw, along.segYaw, Math.min(1, clamped * 6))
    }

    const f = T.length > 0 ? T.done / T.length : 1
    const pitch =
      T.pitch !== null ? player.pitch + (T.pitch - player.pitch) * Math.min(1, f) : player.pitch

    player.setPose(along.x, along.z, yaw, pitch)

    if (T.done >= T.length - 1e-6) {
      const cb = T.onArrive
      if (T.face !== null) player.setPose(along.x, along.z, T.face, pitch)
      travel = null
      if (cb) cb()
    }
  }, -1)

  return null
}
