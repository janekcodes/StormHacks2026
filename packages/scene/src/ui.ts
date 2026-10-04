'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

// Dialog and motion helpers shared by the scene HUD and the 2D site. No three.js
// imports here: `/exhibit/*` loads this through `@museum/scene/ui`.

/** Lighter variant of a zone ink, legible as text on the night surfaces. */
export function lightInk(ink: string): string {
  return `color-mix(in srgb, ${ink} 55%, #ffffff)`
}

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCE_QUERY).matches
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false)
}

/** Exit duration for panels; matches `--dur` in globals.css. */
export const EXIT_MS = 200

export type PresenceState = 'open' | 'closing'

/**
 * Keeps a panel mounted for its exit animation after `open` turns false.
 * Returns null once the panel should unmount.
 */
export function usePresence(open: boolean, exitMs: number = EXIT_MS): PresenceState | null {
  const [state, setState] = useState<PresenceState | null>(open ? 'open' : null)

  useEffect(() => {
    if (open) {
      setState('open')
      return
    }
    const ms = prefersReducedMotion() ? 0 : exitMs
    if (ms === 0) {
      setState(null)
      return
    }
    setState((prev) => (prev ? 'closing' : null))
    const timer = window.setTimeout(() => setState(null), ms)
    return () => window.clearTimeout(timer)
  }, [open, exitMs])

  return open ? 'open' : state
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0
  )
}

/** Keeps Tab and Shift+Tab inside `ref` while `active`. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const root = ref.current
    if (!active || !root) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusableWithin(root)
      if (items.length === 0) {
        event.preventDefault()
        root.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (event.shiftKey && (current === first || current === root)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first?.focus()
      } else if (!root.contains(current)) {
        event.preventDefault()
        first?.focus()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [ref, active])
}

/**
 * Remembers what had focus when `active` turned on and hands focus back when it
 * turns off. `fallback` is used when the original element has left the page.
 */
export function useFocusReturn(active: boolean, fallback?: () => HTMLElement | null | undefined): void {
  const previous = useRef<HTMLElement | null>(null)
  const fallbackRef = useRef(fallback)
  useLayoutEffect(() => {
    fallbackRef.current = fallback
  })

  // Capture before child effects move focus into the panel.
  useLayoutEffect(() => {
    if (!active) return
    const current = document.activeElement
    previous.current = current instanceof HTMLElement && current !== document.body ? current : null
  }, [active])

  // Restore after the commit, once a re-mounted launcher exists in the DOM.
  useEffect(() => {
    if (!active) return
    return () => {
      const target =
        previous.current && previous.current.isConnected ? previous.current : (fallbackRef.current?.() ?? null)
      previous.current = null
      target?.focus({ preventScroll: true })
    }
  }, [active])
}

export { GuideFrame, type GuideFrameProps } from './guide/GuideFrame'
