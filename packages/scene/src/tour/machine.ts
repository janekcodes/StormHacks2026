import type { ExhibitId } from '@museum/content/schema'

export type TourLineKey = 'intro' | 'outro' | 'fallback' | `bridge:${number}`
export type TourPhase = 'idle' | 'intro' | 'bridge' | 'narrate' | 'dwell' | 'outro' | 'done'
export type PauseReason = 'user-pause' | 'user-move' | 'portal-closed' | 'listening' | 'answering'
export type TimerKind = 'clip' | 'walk' | 'narration' | 'dwell'

export interface TourState {
  phase: TourPhase
  /** Stop index; -1 during the intro, stops.length during the outro. */
  index: number
  auto: boolean
  pauseReason: PauseReason | null
  clipDone: boolean
  walkDone: boolean
  /** The visitor closed the exhibit; resume must reopen it. */
  portalLost: boolean
}

export interface TourContext {
  stops: readonly ExhibitId[]
  /** Full timeout for a tour line, including grace for audio. */
  clipMs: (key: TourLineKey) => number
}

export type TourEvent =
  | { type: 'START'; auto?: boolean }
  | { type: 'CLIP_ENDED' }
  | { type: 'WALK_ARRIVED' }
  | { type: 'WALK_CANCELLED' }
  | { type: 'NARRATION_ENDED' }
  | { type: 'PORTAL_CLOSED' }
  | { type: 'TIMEOUT'; kind: TimerKind }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_AUTO'; auto: boolean }
  | { type: 'PAUSE'; reason: PauseReason }
  | { type: 'RESUME' }
  | { type: 'END' }

export type TourEffect =
  | { type: 'playClip'; key: TourLineKey }
  | { type: 'pauseClip' }
  | { type: 'resumeClip' }
  | { type: 'stopClip' }
  | { type: 'walk'; id: ExhibitId }
  | { type: 'cancelWalk' }
  | { type: 'snapTo'; id: ExhibitId }
  | { type: 'openPortal'; id: ExhibitId }
  | { type: 'closePortal' }
  | { type: 'startNarration'; id: ExhibitId }
  | { type: 'pauseNarration' }
  | { type: 'resumeNarration' }
  | { type: 'startTimer'; kind: TimerKind; ms: number }
  | { type: 'clearTimer'; kind: TimerKind }
  | { type: 'clearTimers' }

/** Play time at each stop after the exhibit narration, before Auto advances. */
export const PLAY_MS = 3000
/** Backstop if the exhibit narration never reports its end (longest narration is 27 s). */
export const NARRATION_TIMEOUT_MS = 45_000
export const CLIP_GRACE_MS = 3000
export const WALK_TIMEOUT_MS = 15_000
/** Timeout for a line with no generated audio yet (caption only). */
export const MISSING_CLIP_MS = 6000

export const initialTourState: TourState = {
  phase: 'idle',
  index: -1,
  auto: true,
  pauseReason: null,
  clipDone: false,
  walkDone: false,
  portalLost: false
}

type Out = { state: TourState; effects: TourEffect[] }

const TEARDOWN: TourEffect[] = [
  { type: 'clearTimers' },
  { type: 'stopClip' },
  { type: 'cancelWalk' },
  { type: 'closePortal' }
]

function clipTimer(key: TourLineKey, ctx: TourContext): TourEffect {
  return { type: 'startTimer', kind: 'clip', ms: ctx.clipMs(key) }
}

function stopId(state: TourState, ctx: TourContext): ExhibitId {
  return ctx.stops[state.index]!
}

function enterIntro(ctx: TourContext, auto: boolean): Out {
  return {
    state: { ...initialTourState, auto, phase: 'intro', index: -1 },
    effects: [{ type: 'playClip', key: 'intro' }, clipTimer('intro', ctx)]
  }
}

function enterBridge(state: TourState, index: number, ctx: TourContext, lead: TourEffect[]): Out {
  const key: TourLineKey = `bridge:${index}`
  const id = ctx.stops[index]!
  return {
    state: {
      ...state,
      phase: 'bridge',
      index,
      pauseReason: null,
      clipDone: false,
      walkDone: false,
      portalLost: false
    },
    effects: [
      ...lead,
      { type: 'closePortal' },
      { type: 'playClip', key },
      clipTimer(key, ctx),
      { type: 'walk', id },
      { type: 'startTimer', kind: 'walk', ms: WALK_TIMEOUT_MS }
    ]
  }
}

function enterNarrate(state: TourState, ctx: TourContext, lead: TourEffect[]): Out {
  const id = stopId(state, ctx)
  return {
    state: { ...state, phase: 'narrate', clipDone: false, walkDone: true },
    effects: [
      ...lead,
      { type: 'openPortal', id },
      { type: 'startNarration', id },
      { type: 'startTimer', kind: 'narration', ms: NARRATION_TIMEOUT_MS }
    ]
  }
}

function enterDwell(state: TourState): Out {
  return {
    state: { ...state, phase: 'dwell' },
    effects: [
      { type: 'clearTimer', kind: 'narration' },
      ...(state.auto ? [{ type: 'startTimer', kind: 'dwell', ms: PLAY_MS } as const] : [])
    ]
  }
}

function enterOutro(state: TourState, ctx: TourContext): Out {
  return {
    state: {
      ...state,
      phase: 'outro',
      index: ctx.stops.length,
      pauseReason: null,
      clipDone: false,
      walkDone: true,
      portalLost: false
    },
    effects: [...TEARDOWN, { type: 'playClip', key: 'outro' }, clipTimer('outro', ctx)]
  }
}

function advance(state: TourState, ctx: TourContext): Out {
  if (state.phase === 'outro') {
    return { state: { ...state, phase: 'done', pauseReason: null }, effects: [...TEARDOWN] }
  }
  const next = state.index + 1
  if (next >= ctx.stops.length) return enterOutro(state, ctx)
  return enterBridge(state, next, ctx, TEARDOWN)
}

function back(state: TourState, ctx: TourContext): Out {
  const target =
    state.phase === 'outro' ? ctx.stops.length - 1 : Math.max(0, Math.min(state.index - 1, ctx.stops.length - 1))
  return enterBridge(state, target, ctx, TEARDOWN)
}

function bridgeProgress(state: TourState, ctx: TourContext, lead: TourEffect[]): Out {
  if (state.clipDone && state.walkDone) return enterNarrate(state, ctx, lead)
  return { state, effects: lead }
}

function pauseEffects(state: TourState): TourEffect[] {
  switch (state.phase) {
    case 'intro':
    case 'outro':
      return [{ type: 'pauseClip' }, { type: 'clearTimers' }]
    case 'bridge':
      return [{ type: 'pauseClip' }, { type: 'cancelWalk' }, { type: 'clearTimers' }]
    case 'narrate':
      return [{ type: 'pauseNarration' }, { type: 'clearTimers' }]
    default:
      return [{ type: 'clearTimers' }]
  }
}

function resume(state: TourState, ctx: TourContext): Out {
  const s: TourState = { ...state, pauseReason: null }
  switch (s.phase) {
    case 'intro':
    case 'outro': {
      const key: TourLineKey = s.phase
      return { state: s, effects: [{ type: 'resumeClip' }, clipTimer(key, ctx)] }
    }
    case 'bridge': {
      const effects: TourEffect[] = [{ type: 'closePortal' }]
      if (!s.clipDone) effects.push({ type: 'resumeClip' }, clipTimer(`bridge:${s.index}`, ctx))
      if (!s.walkDone) {
        effects.push({ type: 'walk', id: stopId(s, ctx) }, { type: 'startTimer', kind: 'walk', ms: WALK_TIMEOUT_MS })
      }
      return bridgeProgress(s, ctx, effects)
    }
    case 'narrate':
      if (s.portalLost) return enterNarrate({ ...s, portalLost: false }, ctx, [])
      return {
        state: s,
        effects: [{ type: 'resumeNarration' }, { type: 'startTimer', kind: 'narration', ms: NARRATION_TIMEOUT_MS }]
      }
    case 'dwell': {
      const effects: TourEffect[] = []
      if (s.portalLost) effects.push({ type: 'openPortal', id: stopId(s, ctx) })
      if (s.auto) effects.push({ type: 'startTimer', kind: 'dwell', ms: PLAY_MS })
      return { state: { ...s, portalLost: false }, effects }
    }
    default:
      return { state: s, effects: [] }
  }
}

const same = (state: TourState): Out => ({ state, effects: [] })

export function reduceTour(state: TourState, event: TourEvent, ctx: TourContext): Out {
  switch (event.type) {
    case 'START':
      if (state.phase !== 'idle' && state.phase !== 'done') return same(state)
      return enterIntro(ctx, event.auto ?? state.auto)
    case 'END':
      return { state: { ...initialTourState, auto: state.auto }, effects: [...TEARDOWN] }
    case 'SET_AUTO': {
      const s = { ...state, auto: event.auto }
      if (s.phase !== 'dwell' || s.pauseReason) return same(s)
      return {
        state: s,
        effects: event.auto
          ? [{ type: 'startTimer', kind: 'dwell', ms: PLAY_MS }]
          : [{ type: 'clearTimer', kind: 'dwell' }]
      }
    }
  }

  if (state.phase === 'idle' || state.phase === 'done') return same(state)

  const listening = state.pauseReason === 'listening' || state.pauseReason === 'answering'

  switch (event.type) {
    case 'NEXT':
      if (listening) return same(state)
      if (state.phase === 'intro') return enterBridge(state, 0, ctx, TEARDOWN)
      return advance(state, ctx)
    case 'PREV':
      if (listening) return same(state)
      if (state.phase === 'intro') return enterBridge(state, 0, ctx, TEARDOWN)
      return back(state, ctx)
    case 'PAUSE':
      if (state.pauseReason) {
        const isListening = state.pauseReason === 'listening' || state.pauseReason === 'answering'
        const isNewListening = event.reason === 'listening' || event.reason === 'answering'
        if (isListening && !isNewListening) return same(state)
        return same({ ...state, pauseReason: event.reason })
      }
      return { state: { ...state, pauseReason: event.reason }, effects: pauseEffects(state) }
    case 'RESUME':
      if (!state.pauseReason) return same(state)
      return resume(state, ctx)
    case 'PORTAL_CLOSED':
      if (state.phase !== 'narrate' && state.phase !== 'dwell') return same(state)
      if (state.pauseReason) return same({ ...state, portalLost: true })
      return {
        state: { ...state, portalLost: true, pauseReason: 'portal-closed' },
        effects: [{ type: 'clearTimers' }]
      }
  }

  // Progress events below are ignored while paused.
  if (state.pauseReason) return same(state)

  switch (event.type) {
    case 'WALK_CANCELLED':
      if (state.phase !== 'bridge' || state.walkDone) return same(state)
      return {
        state: { ...state, pauseReason: 'user-move' },
        effects: [{ type: 'pauseClip' }, { type: 'clearTimers' }]
      }
    case 'CLIP_ENDED':
      return clipEnded(state, ctx)
    case 'WALK_ARRIVED':
      if (state.phase !== 'bridge') return same(state)
      return bridgeProgress({ ...state, walkDone: true }, ctx, [{ type: 'clearTimer', kind: 'walk' }])
    case 'NARRATION_ENDED':
      return state.phase === 'narrate' ? enterDwell(state) : same(state)
    case 'TIMEOUT':
      switch (event.kind) {
        case 'clip':
          return clipEnded(state, ctx)
        case 'walk':
          if (state.phase !== 'bridge' || state.walkDone) return same(state)
          return bridgeProgress({ ...state, walkDone: true }, ctx, [{ type: 'snapTo', id: stopId(state, ctx) }])
        case 'narration':
          return state.phase === 'narrate' ? enterDwell(state) : same(state)
        case 'dwell':
          return state.phase === 'dwell' && state.auto ? advance(state, ctx) : same(state)
      }
  }
  return same(state)
}

function clipEnded(state: TourState, ctx: TourContext): Out {
  switch (state.phase) {
    case 'intro':
      return enterBridge(state, 0, ctx, [{ type: 'clearTimer', kind: 'clip' }, { type: 'stopClip' }])
    case 'bridge':
      if (state.clipDone) return same(state)
      return bridgeProgress({ ...state, clipDone: true }, ctx, [
        { type: 'clearTimer', kind: 'clip' },
        { type: 'stopClip' }
      ])
    case 'outro':
      return { state: { ...state, phase: 'done' }, effects: [{ type: 'clearTimers' }] }
    default:
      return same(state)
  }
}
