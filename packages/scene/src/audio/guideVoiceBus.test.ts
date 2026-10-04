import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCaption, isSpeakEnabled, isSpeaking, pushText, setSpeakOverride, stop } from './guideVoiceBus'

describe('setSpeakOverride', () => {
  afterEach(() => {
    stop()
    setSpeakOverride(false)
    vi.unstubAllGlobals()
  })

  it('speaks while overridden without changing the saved setting', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))
    expect(isSpeakEnabled()).toBe(false)

    pushText('Hello there. ')
    expect(isSpeaking()).toBe(false)

    setSpeakOverride(true)
    pushText('Hello there. ')
    expect(isSpeaking()).toBe(true)
    expect(getCaption()).toBe('Hello there.')
    expect(isSpeakEnabled()).toBe(false)
  })
})
