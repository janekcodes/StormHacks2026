import { describe, expect, it } from 'vitest'
import type { ExhibitId } from '@museum/content/schema'
import {
  initialTourState,
  PLAY_MS,
  reduceTour,
  type TourContext,
  type TourEffect,
  type TourEvent,
  type TourState
} from './machine'

const ctx: TourContext = {
  stops: ['A1', 'B2', 'C3'] as ExhibitId[],
  clipMs: () => 4000
}

function run(events: TourEvent[], from: TourState = initialTourState) {
  let state = from
  let effects: TourEffect[] = []
  for (const event of events) {
    const out = reduceTour(state, event, ctx)
    state = out.state
    effects = out.effects
  }
  return { state, effects }
}

const types = (effects: TourEffect[]) => effects.map((effect) => effect.type)

describe('reduceTour', () => {
  it('START plays the intro with a clip timeout', () => {
    const { state, effects } = run([{ type: 'START' }])
    expect(state.phase).toBe('intro')
    expect(effects).toContainEqual({ type: 'playClip', key: 'intro' })
    expect(effects).toContainEqual({ type: 'startTimer', kind: 'clip', ms: 4000 })
  })

  it('intro end starts stop 0: bridge clip and walk together', () => {
    const { state, effects } = run([{ type: 'START' }, { type: 'CLIP_ENDED' }])
    expect(state).toMatchObject({ phase: 'bridge', index: 0, clipDone: false, walkDone: false })
    expect(effects).toContainEqual({ type: 'playClip', key: 'bridge:0' })
    expect(effects).toContainEqual({ type: 'walk', id: 'A1' })
  })

  it('opens the exhibit only when both walk and bridge clip are done, in either order', () => {
    const a = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'WALK_ARRIVED' }])
    expect(a.state.phase).toBe('bridge')
    const b = run([{ type: 'CLIP_ENDED' }], a.state)
    expect(b.state.phase).toBe('narrate')
    expect(b.effects).toContainEqual({ type: 'openPortal', id: 'A1' })
    expect(b.effects).toContainEqual({ type: 'playClip', key: 'stop:0' })
    expect(b.effects).toContainEqual({ type: 'startTimer', kind: 'clip', ms: 4000 })
    expect(types(b.effects)).not.toContain('startNarration')
    expect(b.state).toMatchObject({ clipDone: false, walkDone: true })

    const c = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'CLIP_ENDED' }, { type: 'WALK_ARRIVED' }])
    expect(c.state.phase).toBe('narrate')
  })

  const atNarrate = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'CLIP_ENDED' }, { type: 'WALK_ARRIVED' }]).state

  it('auto: stop line end dwells then advances to the next bridge', () => {
    const dwell = run([{ type: 'CLIP_ENDED' }], atNarrate)
    expect(dwell.state.phase).toBe('dwell')
    expect(dwell.effects).toContainEqual({ type: 'startTimer', kind: 'dwell', ms: PLAY_MS })
    const next = run([{ type: 'TIMEOUT', kind: 'dwell' }], dwell.state)
    expect(next.state).toMatchObject({ phase: 'bridge', index: 1 })
    expect(types(next.effects)).toEqual(expect.arrayContaining(['clearTimers', 'stopClip', 'closePortal']))
    expect(next.effects).toContainEqual({ type: 'walk', id: 'B2' })
  })

  it('manual: stop line end waits for NEXT', () => {
    const manual = run([{ type: 'SET_AUTO', auto: false }, { type: 'CLIP_ENDED' }], atNarrate)
    expect(manual.state.phase).toBe('dwell')
    expect(manual.effects).not.toContainEqual(expect.objectContaining({ type: 'startTimer' }))
    expect(run([{ type: 'TIMEOUT', kind: 'dwell' }], manual.state).state.phase).toBe('dwell')
    expect(run([{ type: 'NEXT' }], manual.state).state).toMatchObject({ phase: 'bridge', index: 1 })
  })

  it('turning auto on while dwelling starts the dwell timer', () => {
    const manual = run([{ type: 'SET_AUTO', auto: false }, { type: 'CLIP_ENDED' }], atNarrate)
    const on = run([{ type: 'SET_AUTO', auto: true }], manual.state)
    expect(on.effects).toContainEqual({ type: 'startTimer', kind: 'dwell', ms: PLAY_MS })
  })

  it('pause in narrate pauses the stop line; resume continues it', () => {
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], atNarrate)
    expect(paused.state.pauseReason).toBe('user-pause')
    expect(types(paused.effects)).toEqual(['pauseClip', 'clearTimers'])
    const resumed = run([{ type: 'RESUME' }], paused.state)
    expect(resumed.state.pauseReason).toBeNull()
    expect(types(resumed.effects)).toEqual(['resumeClip', 'startTimer'])
  })

  it('pause mid-bridge cancels the walk and pauses the clip; resume restarts only what is unfinished', () => {
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'CLIP_ENDED' }]).state // clip done, walking
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], bridge)
    expect(types(paused.effects)).toEqual(['pauseClip', 'cancelWalk', 'clearTimers'])
    const resumed = run([{ type: 'RESUME' }], paused.state)
    expect(resumed.effects).toContainEqual({ type: 'walk', id: 'A1' })
    expect(types(resumed.effects)).not.toContain('resumeClip')
  })

  it('ignores progress events while paused', () => {
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], atNarrate).state
    expect(run([{ type: 'CLIP_ENDED' }], paused).state.phase).toBe('narrate')
    expect(run([{ type: 'TIMEOUT', kind: 'clip' }], paused).state.phase).toBe('narrate')
  })

  it('user moving during a walk pauses with user-move', () => {
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }]).state
    const moved = run([{ type: 'WALK_CANCELLED' }], bridge)
    expect(moved.state.pauseReason).toBe('user-move')
    expect(types(moved.effects)).toEqual(['pauseClip', 'clearTimers'])
  })

  it('user closing the exhibit pauses; resume reopens and replays the stop line', () => {
    const closed = run([{ type: 'PORTAL_CLOSED' }], atNarrate)
    expect(closed.state).toMatchObject({ pauseReason: 'portal-closed', portalLost: true })
    const resumed = run([{ type: 'RESUME' }], closed.state)
    expect(resumed.effects).toContainEqual({ type: 'openPortal', id: 'A1' })
    expect(resumed.effects).toContainEqual({ type: 'playClip', key: 'stop:0' })
    expect(resumed.state.portalLost).toBe(false)
  })

  it('skip works from every phase and clears a user pause', () => {
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }]).state
    const pausedNarrate = run([{ type: 'PAUSE', reason: 'user-pause' }], atNarrate).state
    for (const from of [bridge, atNarrate, pausedNarrate]) {
      const out = run([{ type: 'NEXT' }], from)
      expect(out.state).toMatchObject({ phase: 'bridge', index: 1, pauseReason: null })
      expect(out.effects).toContainEqual({ type: 'walk', id: 'B2' })
    }
    const intro = run([{ type: 'START' }, { type: 'NEXT' }]).state
    expect(intro).toMatchObject({ phase: 'bridge', index: 0 })
  })

  it('skip is ignored while listening or answering', () => {
    for (const reason of ['listening', 'answering'] as const) {
      const paused = run([{ type: 'PAUSE', reason }], atNarrate).state
      expect(run([{ type: 'NEXT' }], paused).state).toEqual(paused)
      expect(run([{ type: 'PREV' }], paused).state).toEqual(paused)
    }
  })

  it('skip from the last stop plays the outro, then done', () => {
    let state = atNarrate
    state = run([{ type: 'NEXT' }, { type: 'NEXT' }], state).state
    expect(state).toMatchObject({ phase: 'bridge', index: 2 })
    const outro = run([{ type: 'NEXT' }], state)
    expect(outro.state.phase).toBe('outro')
    expect(outro.effects).toContainEqual({ type: 'playClip', key: 'outro' })
    expect(run([{ type: 'CLIP_ENDED' }], outro.state).state.phase).toBe('done')
  })

  it('prev goes back one stop and never below the first', () => {
    const two = run([{ type: 'NEXT' }], atNarrate).state
    expect(run([{ type: 'PREV' }], two).state).toMatchObject({ phase: 'bridge', index: 0 })
    expect(run([{ type: 'PREV' }], atNarrate).state).toMatchObject({ phase: 'bridge', index: 0 })
  })

  it('timeouts stand in for missing audio and stuck walks', () => {
    const bridge = run([{ type: 'START' }, { type: 'TIMEOUT', kind: 'clip' }]).state
    expect(bridge.phase).toBe('bridge')
    const walkTimeout = run([{ type: 'TIMEOUT', kind: 'clip' }, { type: 'TIMEOUT', kind: 'walk' }], bridge)
    expect(walkTimeout.state.phase).toBe('narrate')
    const snap = run([{ type: 'TIMEOUT', kind: 'walk' }], bridge)
    expect(snap.effects).toContainEqual({ type: 'snapTo', id: 'A1' })
    expect(run([{ type: 'TIMEOUT', kind: 'clip' }], atNarrate).state.phase).toBe('dwell')
  })

  it('CLIP_ENDED in narrate enters dwell: PLAY_MS timer under Auto, none under Manual', () => {
    const auto = run([{ type: 'CLIP_ENDED' }], atNarrate)
    expect(auto.state.phase).toBe('dwell')
    expect(auto.effects).toContainEqual({ type: 'clearTimer', kind: 'clip' })
    expect(auto.effects).toContainEqual({ type: 'startTimer', kind: 'dwell', ms: PLAY_MS })
    const manual = run([{ type: 'SET_AUTO', auto: false }, { type: 'CLIP_ENDED' }], atNarrate)
    expect(manual.state.phase).toBe('dwell')
    expect(manual.effects.some((effect) => effect.type === 'startTimer')).toBe(false)
  })

  it('TIMEOUT clip in narrate enters dwell', () => {
    const out = run([{ type: 'TIMEOUT', kind: 'clip' }], atNarrate)
    expect(out.state.phase).toBe('dwell')
    expect(out.effects).toContainEqual({ type: 'startTimer', kind: 'dwell', ms: PLAY_MS })
  })

  it('NARRATION_ENDED and TIMEOUT narration are no-ops in every phase', () => {
    const dwell = run([{ type: 'CLIP_ENDED' }], atNarrate).state
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }]).state
    for (const from of [initialTourState, bridge, atNarrate, dwell]) {
      for (const event of [{ type: 'NARRATION_ENDED' }, { type: 'TIMEOUT', kind: 'narration' }] as TourEvent[]) {
        const out = run([event], from)
        expect(out.state).toEqual(from)
        expect(out.effects).toEqual([])
      }
    }
  })

  it('a stale walk timeout outside a bridge is ignored', () => {
    expect(run([{ type: 'TIMEOUT', kind: 'walk' }], atNarrate).state).toEqual(atNarrate)
  })

  it('END tears everything down and keeps the auto setting', () => {
    const manual = run([{ type: 'SET_AUTO', auto: false }], atNarrate).state
    const ended = run([{ type: 'END' }], manual)
    expect(ended.state).toEqual({ ...initialTourState, auto: false })
    expect(types(ended.effects)).toEqual(['clearTimers', 'stopClip', 'cancelWalk', 'closePortal'])
  })

  it('WALK_CANCELLED is ignored once the walk has arrived', () => {
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'CLIP_ENDED' }]).state // clip done, walking
    const withWalkDone = { ...bridge, walkDone: true } // manually set walkDone without clip done
    const out = run([{ type: 'WALK_CANCELLED' }], withWalkDone)
    expect(out.state).toEqual(withWalkDone)
    expect(out.effects).toEqual([])
  })

  it('PAUSE user-pause over listening keeps listening', () => {
    const paused = run([{ type: 'PAUSE', reason: 'listening' }], atNarrate).state
    const out = run([{ type: 'PAUSE', reason: 'user-pause' }], paused)
    expect(out.state.pauseReason).toBe('listening')
    expect(out.effects).toEqual([])
    expect(run([{ type: 'NEXT' }], out.state).state.pauseReason).toBe('listening')
  })

  it('PAUSE answering over listening becomes answering', () => {
    const paused = run([{ type: 'PAUSE', reason: 'listening' }], atNarrate).state
    const out = run([{ type: 'PAUSE', reason: 'answering' }], paused)
    expect(out.state.pauseReason).toBe('answering')
    expect(out.effects).toEqual([])
  })

  it('PORTAL_CLOSED in dwell pauses with portalLost; RESUME re-opens portal and starts dwell timer', () => {
    const dwell = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'CLIP_ENDED' }, { type: 'WALK_ARRIVED' }, { type: 'CLIP_ENDED' }]).state
    const closed = run([{ type: 'PORTAL_CLOSED' }], dwell)
    expect(closed.state).toMatchObject({ pauseReason: 'portal-closed', portalLost: true, phase: 'dwell' })
    expect(closed.effects).toContainEqual({ type: 'clearTimers' })
    const resumed = run([{ type: 'RESUME' }], closed.state)
    expect(resumed.effects).toContainEqual({ type: 'openPortal', id: 'A1' })
    expect(resumed.effects).toContainEqual({ type: 'startTimer', kind: 'dwell', ms: PLAY_MS })
    expect(resumed.state.portalLost).toBe(false)
  })

  it('pause and resume in intro', () => {
    const intro = run([{ type: 'START' }]).state
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], intro)
    expect(types(paused.effects)).toEqual(['pauseClip', 'clearTimers'])
    const resumed = run([{ type: 'RESUME' }], paused.state)
    expect(types(resumed.effects)).toEqual(['resumeClip', 'startTimer'])
    expect(resumed.effects).toContainEqual({ type: 'startTimer', kind: 'clip', ms: 4000 })
  })

  it('pause and resume in outro', () => {
    let state = atNarrate
    state = run([{ type: 'NEXT' }, { type: 'NEXT' }, { type: 'NEXT' }], state).state
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], state)
    expect(types(paused.effects)).toEqual(['pauseClip', 'clearTimers'])
    const resumed = run([{ type: 'RESUME' }], paused.state)
    expect(types(resumed.effects)).toEqual(['resumeClip', 'startTimer'])
    expect(resumed.effects).toContainEqual({ type: 'startTimer', kind: 'clip', ms: 4000 })
  })

  it('RESUME mid-bridge with clip unfinished resumes clip and re-walks if walk unfinished', () => {
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }]).state // in bridge, clipDone=false, walkDone=false
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], bridge).state
    const resumed = run([{ type: 'RESUME' }], paused)
    expect(resumed.effects).toContainEqual({ type: 'resumeClip' })
    expect(resumed.effects).toContainEqual({ type: 'walk', id: 'A1' })
  })

  it('skip from dwell', () => {
    const dwell = run([{ type: 'START' }, { type: 'CLIP_ENDED' }, { type: 'CLIP_ENDED' }, { type: 'WALK_ARRIVED' }, { type: 'CLIP_ENDED' }]).state
    const out = run([{ type: 'NEXT' }], dwell)
    expect(out.state.phase).toBe('bridge')
    expect(out.state.index).toBe(1)
  })

  it('skip from outro goes to done', () => {
    let state = atNarrate
    state = run([{ type: 'NEXT' }, { type: 'NEXT' }, { type: 'NEXT' }], state).state
    const out = run([{ type: 'NEXT' }], state)
    expect(out.state.phase).toBe('done')
  })

  it('skip from portal-closed pause', () => {
    const closed = run([{ type: 'PORTAL_CLOSED' }], atNarrate).state
    const out = run([{ type: 'NEXT' }], closed)
    expect(out.state.phase).toBe('bridge')
    expect(out.state.index).toBe(1)
    expect(out.state.pauseReason).toBeNull()
  })

  it('progress events are ignored while paused in bridge', () => {
    const bridge = run([{ type: 'START' }, { type: 'CLIP_ENDED' }]).state
    const paused = run([{ type: 'PAUSE', reason: 'user-pause' }], bridge).state
    expect(run([{ type: 'CLIP_ENDED' }], paused).state).toEqual(paused)
    expect(run([{ type: 'WALK_ARRIVED' }], paused).state).toEqual(paused)
  })
})
