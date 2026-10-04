import { afterEach, beforeEach, describe, expect, it } from 'vitest'

class FakeAudio {
  src: string
  paused = true
  currentTime = 0
  muted = false
  playbackRate = 1
  ended = false
  static rejectWith: Error | null = null
  private listeners = new Map<string, Array<() => void>>()
  constructor(src = '') {
    this.src = src
  }
  play() {
    this.paused = false
    return FakeAudio.rejectWith ? Promise.reject(FakeAudio.rejectWith) : Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }
  fire(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn()
  }
}

const AUDIO = { src: '/a.mp3', align: '/a.json', voiceId: 'v', modelId: 'm', hash: 'h' }

describe('narratorBus tour hooks', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { Audio: unknown }).Audio = FakeAudio
  })
  afterEach(() => {
    delete (globalThis as unknown as { Audio?: unknown }).Audio
    FakeAudio.rejectWith = null
  })

  it('pause keeps the position and resume plays on from it', async () => {
    const bus = await import('./narratorBus')
    bus.startNarration(AUDIO)
    const el = bus.getActiveAudio() as unknown as FakeAudio
    el.currentTime = 7
    bus.pauseNarration()
    expect(el.paused).toBe(true)
    expect(el.currentTime).toBe(7)
    bus.resumeNarration()
    expect(el.paused).toBe(false)
    expect(el.currentTime).toBe(7)
    bus.stopNarration()
  })

  it('notifies ended listeners only for the active clip', async () => {
    const bus = await import('./narratorBus')
    let ended = 0
    const off = bus.onNarrationEnded(() => ended++)
    bus.startNarration(AUDIO)
    const first = bus.getActiveAudio() as unknown as FakeAudio
    bus.startNarration(AUDIO)
    first.fire('ended')
    expect(ended).toBe(0)
    ;(bus.getActiveAudio() as unknown as FakeAudio).fire('ended')
    expect(ended).toBe(1)
    off()
    bus.stopNarration()
  })

  it('keeps the position when guide speech interrupts a paused narration', async () => {
    const bus = await import('./narratorBus')
    bus.startNarration(AUDIO)
    const el = bus.getActiveAudio() as unknown as FakeAudio
    el.currentTime = 7
    bus.pauseNarration()
    bus.interruptNarration()
    expect(el.currentTime).toBe(7)
    bus.resumeNarration()
    expect(el.currentTime).toBe(7)
    expect(el.paused).toBe(false)
    bus.stopNarration()
  })

  it('still rewinds a narration that is playing when interrupted', async () => {
    const bus = await import('./narratorBus')
    bus.startNarration(AUDIO)
    const el = bus.getActiveAudio() as unknown as FakeAudio
    el.currentTime = 7
    bus.interruptNarration()
    expect(el.paused).toBe(true)
    expect(el.currentTime).toBe(0)
    bus.stopNarration()
  })

  it('resume of an already finished narration notifies ended instead of replaying', async () => {
    const bus = await import('./narratorBus')
    let ended = 0
    const off = bus.onNarrationEnded(() => ended++)
    bus.startNarration(AUDIO)
    const el = bus.getActiveAudio() as unknown as FakeAudio
    el.paused = true
    el.ended = true
    bus.resumeNarration()
    expect(ended).toBe(1)
    expect(el.paused).toBe(true)
    off()
    bus.stopNarration()
  })

  it('reports a failure when the active element errors', async () => {
    const bus = await import('./narratorBus')
    let failed = 0
    const off = bus.onNarrationFailed(() => failed++)
    bus.startNarration(AUDIO)
    ;(bus.getActiveAudio() as unknown as FakeAudio).fire('error')
    expect(failed).toBe(1)
    off()
    bus.stopNarration()
  })

  it('reports a failure when play() of the active element rejects', async () => {
    const bus = await import('./narratorBus')
    let failed = 0
    const off = bus.onNarrationFailed(() => failed++)
    FakeAudio.rejectWith = new DOMException('no source', 'NotSupportedError')
    bus.startNarration(AUDIO)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(failed).toBe(1)
    off()
    bus.stopNarration()
  })

  it('does not report a failure for an autoplay block (NotAllowedError)', async () => {
    const bus = await import('./narratorBus')
    let failed = 0
    const off = bus.onNarrationFailed(() => failed++)
    FakeAudio.rejectWith = new DOMException('blocked', 'NotAllowedError')
    bus.startNarration(AUDIO)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(failed).toBe(0)
    off()
    bus.stopNarration()
  })

  it('ignores failures from a stale element', async () => {
    const bus = await import('./narratorBus')
    let failed = 0
    const off = bus.onNarrationFailed(() => failed++)
    bus.startNarration(AUDIO)
    const first = bus.getActiveAudio() as unknown as FakeAudio
    bus.startNarration(AUDIO)
    first.fire('error')
    expect(failed).toBe(0)
    off()
    bus.stopNarration()
  })

  it('reports a failure when an exhibit has no audio record', async () => {
    const bus = await import('./narratorBus')
    let failed = 0
    const off = bus.onNarrationFailed(() => failed++)
    bus.registerExhibitAudio([])
    bus.startNarrationFor('A1' as never)
    expect(failed).toBe(1)
    off()
  })
})
