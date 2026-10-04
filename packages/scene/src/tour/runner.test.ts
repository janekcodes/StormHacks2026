import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExhibitId } from '@museum/content/schema'
import type { TourEvent } from './machine'
import { createTourRunner, type RunnerDeps } from './runner'

function setup() {
  const events: TourEvent[] = []
  let arrive: (() => void) | undefined
  let cancel: (() => void) | undefined
  let openId: ExhibitId | null = null
  const passportListeners: Array<(id: ExhibitId | null, prev: ExhibitId | null) => void> = []
  const setOpen = (id: ExhibitId | null) => {
    const prev = openId
    openId = id
    for (const fn of passportListeners) fn(id, prev)
  }
  const deps: RunnerDeps = {
    dispatch: (event) => events.push(event),
    clips: { play: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), caption: () => null },
    walkTo: vi.fn((_id, opts) => {
      arrive = opts.onArrive
      cancel = opts.onCancel
      return true
    }),
    cancelTravel: vi.fn(() => cancel?.()),
    snapTo: vi.fn(),
    openPortal: (id) => setOpen(id),
    closePortal: () => setOpen(null),
    subscribePortal: (fn) => {
      passportListeners.push(fn)
      return () => undefined
    },
    startNarration: vi.fn(),
    pauseNarration: vi.fn(),
    resumeNarration: vi.fn(),
    onNarrationEnded: () => () => undefined,
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (handle) => globalThis.clearTimeout(handle)
  }
  return { deps, events, arrive: () => arrive?.(), userCancel: () => cancel?.(), setOpen }
}

describe('createTourRunner', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports arrival of the current walk only', () => {
    const t = setup()
    const runner = createTourRunner(t.deps)
    runner.run([{ type: 'walk', id: 'A1' as ExhibitId }])
    const firstCall = (t.deps.walkTo as ReturnType<typeof vi.fn>).mock.calls[0]!
    const staleArrive = (firstCall[1] as { onArrive: () => void }).onArrive
    runner.run([{ type: 'walk', id: 'B2' as ExhibitId }])
    staleArrive() // from the replaced walk: must be ignored
    t.arrive() // the current walk
    expect(t.events.filter((event) => event.type === 'WALK_ARRIVED')).toHaveLength(1)
  })

  it('a tour-initiated cancel is silent; a user cancel reports WALK_CANCELLED', () => {
    const t = setup()
    const runner = createTourRunner(t.deps)
    runner.run([{ type: 'walk', id: 'A1' as ExhibitId }, { type: 'cancelWalk' }])
    expect(t.events).toEqual([])
    runner.run([{ type: 'walk', id: 'A1' as ExhibitId }])
    t.userCancel()
    expect(t.events).toEqual([{ type: 'WALK_CANCELLED' }])
  })

  it('a failed walk falls through to the walk timeout path', () => {
    const t = setup()
    t.deps.walkTo = vi.fn(() => false)
    createTourRunner(t.deps).run([{ type: 'walk', id: 'A1' as ExhibitId }])
    expect(t.events).toEqual([{ type: 'TIMEOUT', kind: 'walk' }])
  })

  it('tour opening and closing the portal is silent; a user close reports PORTAL_CLOSED', () => {
    const t = setup()
    const runner = createTourRunner(t.deps)
    runner.run([{ type: 'openPortal', id: 'A1' as ExhibitId }, { type: 'closePortal' }])
    expect(t.events).toEqual([])
    runner.run([{ type: 'openPortal', id: 'A1' as ExhibitId }])
    t.setOpen(null)
    expect(t.events).toEqual([{ type: 'PORTAL_CLOSED' }])
  })

  it('a timer of the same kind replaces the previous one; clearTimers cancels all', () => {
    vi.useFakeTimers()
    const t = setup()
    const runner = createTourRunner(t.deps)
    runner.run([{ type: 'startTimer', kind: 'clip', ms: 100 }, { type: 'startTimer', kind: 'clip', ms: 300 }])
    vi.advanceTimersByTime(150)
    expect(t.events).toEqual([])
    vi.advanceTimersByTime(200)
    expect(t.events).toEqual([{ type: 'TIMEOUT', kind: 'clip' }])
    runner.run([{ type: 'startTimer', kind: 'dwell', ms: 100 }, { type: 'clearTimers' }])
    vi.advanceTimersByTime(500)
    expect(t.events).toHaveLength(1)
  })
})
