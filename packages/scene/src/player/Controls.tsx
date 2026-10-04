'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Building } from '@museum/content/plan-schema'
import type { Exhibit } from '@museum/content/schema'
import {
  buildCollisionSegments,
  buildExhibitSegments,
  buildObstacles,
  slideMove,
  type Circle
} from './collision'
import {
  EYE_HEIGHT,
  PITCH_LIMIT,
  RUN_SPEED,
  TURN_SPEED,
  WALK_SPEED,
  usePlayer
} from './usePlayer'
import { roomAt } from '../rooms'
import { isTravelling } from '../nav/travel'
import { requestOpen } from '../exhibits/open'
import { useExhibitUi } from '../exhibits/ui'
import { usePassport } from '../passport'
import { useReducedMotion } from '../ui'

const MOVE_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'q',
  'shift',
  'vf',
  'vb',
  'vl',
  'vr'
])

function keyName(e: KeyboardEvent): string {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
  if (k === ' ') return 'space'
  return k
}

/**
 * Typing targets (the guide input, any future fields) and keyboard-driven
 * widgets (the Navigate menu, dialogs) must never drive movement.
 */
export function isUiTarget(e: KeyboardEvent): boolean {
  const target = e.target
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable ||
    target.closest('[role="menu"], [role="dialog"]') !== null
  )
}

interface ControlsProps {
  building: Building
  exhibits: readonly Exhibit[]
  container: HTMLElement | null
  /** Extra circular obstacles (gallery benches). */
  obstacles?: readonly Circle[]
}

export function Controls({ building, exhibits, container, obstacles }: ControlsProps) {
  const { camera } = useThree()
  const segs = useMemo(
    () => [...buildCollisionSegments(building), ...buildExhibitSegments(exhibits)],
    [building, exhibits]
  )
  const circles = useMemo(() => [...buildObstacles(building), ...(obstacles ?? [])], [building, obstacles])
  const bob = useRef(0)
  const reducedMotion = useReducedMotion()
  const zoneTick = useRef(0)
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null)

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useEffect(() => {
    if (!container) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (usePassport.getState().openId) return
      if (isUiTarget(e)) return
      const k = keyName(e)
      if (MOVE_KEYS.has(k)) {
        e.preventDefault()
        usePlayer.getState().setKey(k, true)
      } else if (k === 'm' && e.target === container) {
        usePlayer.getState().toggleMap()
      } else if ((k === 'e' || k === 'enter' || k === 'space') && e.target === container) {
        const id = useExhibitUi.getState().focusId
        if (id) {
          e.preventDefault()
          requestOpen(id)
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      usePlayer.getState().setKey(keyName(e), false)
    }
    const onBlur = () => usePlayer.getState().clearKeys()

    container.addEventListener('keydown', onKeyDown)
    container.addEventListener('keyup', onKeyUp)
    container.addEventListener('blur', onBlur)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      container.removeEventListener('keyup', onKeyUp)
      container.removeEventListener('blur', onBlur)
    }
  }, [container])

  useEffect(() => {
    if (!container) return
    const canvas = container.querySelector('canvas')
    if (!canvas) return

    const onDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return
      container.focus({ preventScroll: true })
      drag.current = { x: e.clientX, y: e.clientY, moved: 0 }
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const onMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      d.x = e.clientX
      d.y = e.clientY
      d.moved += Math.abs(dx) + Math.abs(dy)
      if (d.moved > 4) {
        const s = usePlayer.getState()
        const yaw = s.yaw - dx * 0.0042
        const pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, s.pitch - dy * 0.0035))
        s.setLook(yaw, pitch)
      }
    }
    const onUp = () => {
      drag.current = null
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [container])

  useFrame((_, dt) => {
    if (usePassport.getState().openId) return
    const clamped = Math.min(0.05, dt)
    const s = usePlayer.getState()
    const k = s.keys
    const auto = isTravelling()

    let yaw = s.yaw
    let x = s.x
    let z = s.z
    let moving = auto

    if (!auto) {
      const turn = (k.arrowleft || k.q || k.vl ? 1 : 0) - (k.arrowright || k.vr ? 1 : 0)
      yaw = s.yaw + turn * TURN_SPEED * clamped

      const fw = (k.w || k.arrowup || k.vf ? 1 : 0) - (k.s || k.arrowdown || k.vb ? 1 : 0)
      const st = (k.d ? 1 : 0) - (k.a ? 1 : 0)

      if (fw || st) {
        const spd = (k.shift ? RUN_SPEED : WALK_SPEED) * clamped
        const sx = -Math.sin(yaw)
        const sz = -Math.cos(yaw)
        const rx = Math.cos(yaw)
        const rz = -Math.sin(yaw)
        let mx = sx * fw + rx * st
        let mz = sz * fw + rz * st
        const m = Math.hypot(mx, mz) || 1
        mx = (mx / m) * spd
        mz = (mz / m) * spd
        const next = slideMove(x, z, mx, mz, segs, circles)
        x = next.x
        z = next.z
      }

      moving =
        !!fw ||
        !!st ||
        !!(k.w || k.s || k.a || k.d || k.arrowup || k.arrowdown || k.vf || k.vb)

      if (x !== s.x || z !== s.z || yaw !== s.yaw) {
        s.setPose(x, z, yaw, s.pitch)
      }
    } else {
      // TravelDriver owns pose; refresh locals after it runs this frame.
      x = s.x
      z = s.z
      yaw = s.yaw
    }

    if (moving) bob.current += clamped * 9

    const sway = moving && !reducedMotion ? Math.sin(bob.current) * 0.018 : 0
    camera.position.set(x, EYE_HEIGHT + sway, z)
    camera.rotation.set(s.pitch, yaw, 0)

    zoneTick.current++
    if (zoneTick.current % 6 === 0) {
      const room = roomAt(building, x, z)
      const key = room?.key ?? 'Outside'
      const name = room?.name ?? 'Outside the museum'
      if (key !== s.zoneKey) s.setZone(key, name)
    }
  })

  return null
}

/** On-screen hold buttons for touch. Rendered outside the Canvas. */
export function TouchControls() {
  const setKey = usePlayer((s) => s.setKey)

  const hold = (key: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      setKey(key, true)
    },
    onPointerUp: () => setKey(key, false),
    onPointerCancel: () => setKey(key, false),
    onLostPointerCapture: () => setKey(key, false)
  })

  return (
    <div className="museum-touch" role="group" aria-label="Touch movement controls">
      <button type="button" className="btn btn--glass" data-key="vf" aria-label="Walk forward" {...hold('vf')}>
        <span aria-hidden="true">▲</span>
      </button>
      <button type="button" className="btn btn--glass" data-key="vl" aria-label="Turn left" {...hold('vl')}>
        <span aria-hidden="true">◀</span>
      </button>
      <button type="button" className="btn btn--glass" data-key="vb" aria-label="Walk back" {...hold('vb')}>
        <span aria-hidden="true">▼</span>
      </button>
      <button type="button" className="btn btn--glass" data-key="vr" aria-label="Turn right" {...hold('vr')}>
        <span aria-hidden="true">▶</span>
      </button>
    </div>
  )
}
