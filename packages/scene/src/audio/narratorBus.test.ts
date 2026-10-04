import { afterEach, beforeEach, describe, expect, it } from 'vitest'

class FakeAudio {
  src: string
  paused = true
  currentTime = 0
  muted = false
  playbackRate = 1
  private listeners = new Map<string, Array<() => void>>()
  constructor(src = '') {
    this.src = src
  }
  play() {
    this.paused = false
    return Promise.resolve()
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
})
