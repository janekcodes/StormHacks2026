'use client'

import type { Exhibit, ExhibitId } from '@museum/content/schema'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Seg } from '../player/collision'
import { usePlayer } from '../player/usePlayer'
import { usePassport } from '../passport'
import { bestFocus, HOVER_MAX_M, lineClear } from './focus'
import { getHits } from './hits'
import { requestOpen } from './open'
import { useExhibitUi } from './ui'

function asExhibitId(value: unknown, allowed: ReadonlySet<string>): ExhibitId | null {
  if (typeof value !== 'string' || !allowed.has(value)) return null
  return value as ExhibitId
}

/** Focus cone each frame, plus hover and click raycasts that require a clear line of sight. */
export function useFocus(exhibits: readonly Exhibit[], segs: readonly Seg[]): void {
  const { camera, gl } = useThree()
  const ray = useRef(new THREE.Raycaster())
  const ndc = useRef(new THREE.Vector2())
  const lastPick = useRef(0)
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null)
  const allowed = useMemo(() => new Set<string>(exhibits.map((exhibit) => exhibit.id)), [exhibits])
  const points = useMemo(
    () => exhibits.map((exhibit) => ({ id: exhibit.id, x: exhibit.position.x, z: exhibit.position.z })),
    [exhibits]
  )

  useFrame(() => {
    if (usePassport.getState().openId) return
    const { x, z, yaw } = usePlayer.getState()
    useExhibitUi.getState().setFocus(bestFocus(x, z, yaw, points))
  })

  useEffect(() => {
    const el = gl.domElement

    const pick = (clientX: number, clientY: number): ExhibitId | null => {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      ndc.current.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      )
      ray.current.setFromCamera(ndc.current, camera)
      const found = ray.current.intersectObjects([...getHits()], false)
      const { x, z } = usePlayer.getState()
      for (const hit of found) {
        if (hit.distance > HOVER_MAX_M) break
        if (hit.object.parent && !hit.object.parent.visible) continue
        const id = asExhibitId(hit.object.userData.exhibitId, allowed)
        const ex = hit.object.userData.x
        const ez = hit.object.userData.z
        if (!id || typeof ex !== 'number' || typeof ez !== 'number') continue
        const tx = ex - (ex - x) * 0.15
        const tz = ez - (ez - z) * 0.15
        if (lineClear(x, z, tx, tz, segs)) return id
      }
      return null
    }

    const onDown = (event: PointerEvent) => {
      if (event.button !== undefined && event.button !== 0) return
      drag.current = { x: event.clientX, y: event.clientY, moved: 0 }
    }
    const onMove = (event: PointerEvent) => {
      const dragging = drag.current
      if (dragging) {
        dragging.moved += Math.abs(event.clientX - dragging.x) + Math.abs(event.clientY - dragging.y)
        dragging.x = event.clientX
        dragging.y = event.clientY
        return
      }
      if (event.pointerType && event.pointerType !== 'mouse') return
      const now = performance.now()
      if (now - lastPick.current < 70) return
      lastPick.current = now
      if (usePassport.getState().openId) return
      const id = pick(event.clientX, event.clientY)
      useExhibitUi.getState().setHover(id)
      el.classList.toggle('hot', id !== null)
    }
    const onUp = (event: PointerEvent) => {
      const dragging = drag.current
      drag.current = null
      if (!dragging || dragging.moved > 6) return
      if (usePassport.getState().openId) return
      const id = pick(event.clientX, event.clientY)
      if (id) requestOpen(id)
    }
    const onLeave = () => {
      if (drag.current) return
      useExhibitUi.getState().setHover(null)
      el.classList.remove('hot')
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [allowed, camera, gl, segs])
}
