import { describe, expect, it, vi } from 'vitest'
import type { TourLine } from '@museum/content/tour-schema'
import { createClipPlayer } from './clips'
import type { TourLineKey } from './machine'

class FakeEl {
  muted = false
  paused = true
  onended: (() => void) | null = null
  constructor(readonly src: string) {}
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

function line(text: string, src?: string): TourLine {
  // Test fixture: only the fields the player reads are filled in.
  return {
    text,
    ...(src
      ? { audio: { src, align: '/x.json', voiceId: 'v', modelId: 'm', hash: 'h' }, durationMs: 1000 }
      : {})
  } as unknown as TourLine
}

function setup() {
  const lines: Record<string, TourLine> = {
    intro: line('Hello', '/intro.mp3'),
    outro: line('Bye', '/outro.mp3'),
    fallback: line('Caption only')
  }
  const els: FakeEl[] = []
  const onEnded = vi.fn()
  const captions: Array<string | null> = []
  const player = createClipPlayer({
    resolve: (key: TourLineKey) => lines[key],
    onEnded,
    onCaption: (text) => captions.push(text),
    isMuted: () => false,
    createAudio: (src) => {
      const el = new FakeEl(src)
      els.push(el)
      return el as unknown as HTMLAudioElement
    }
  })
  return { player, els, onEnded, captions }
}

describe('createClipPlayer', () => {
  it('ignores onended from a stopped element', () => {
    const t = setup()
    t.player.play('intro')
    const old = t.els[0]!
    const stale = old.onended
    t.player.stop()
    expect(old.onended).toBeNull()
    stale?.()
    expect(t.onEnded).not.toHaveBeenCalled()
  })

  it('ignores onended from a replaced element but honors the new one', () => {
    const t = setup()
    t.player.play('intro')
    t.player.play('outro')
    const [a, b] = t.els as [FakeEl, FakeEl]
    expect(a.paused).toBe(true)
    a.onended?.()
    expect(t.onEnded).not.toHaveBeenCalled()
    b.onended?.()
    expect(t.onEnded).toHaveBeenCalledTimes(1)
  })

  it('a line without audio sets the caption and creates no element', () => {
    const t = setup()
    t.player.play('fallback')
    expect(t.els).toHaveLength(0)
    expect(t.player.caption()).toBe('Caption only')
    expect(t.captions.at(-1)).toBe('Caption only')
  })
})
