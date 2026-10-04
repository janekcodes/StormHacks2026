'use client'

import type { ExhibitAudio } from '@museum/content/schema'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { parseAlignment, type AlignmentFile } from './alignment'
import { getActiveAudio, isMuted, setMuted, subscribe } from './narratorBus'

interface NarratorProps {
  audio: ExhibitAudio
  title: string
}

function wordIndexAt(words: readonly AlignmentFile['words'][number][], ms: number): number {
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (word && ms >= word.startMs && ms <= word.endMs) return i
  }
  return -1
}

const serverSnapshot = (): HTMLAudioElement | null => null

/**
 * Plays an exhibit's narration with synced, word-highlighted captions.
 * The narration element is owned by `narratorBus` and started at the opening
 * click (before the walk-to), so this component binds to that shared element
 * rather than rendering its own. Unmounting (close or prev/next) does not
 * stop playback on its own: open.ts stops it explicitly.
 */
export function Narrator({ audio, title }: NarratorProps) {
  const el = useSyncExternalStore(subscribe, getActiveAudio, serverSnapshot)
  const [words, setWords] = useState<AlignmentFile | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [speed, setSpeed] = useState<1 | 1.25>(1)
  const [currentWord, setCurrentWord] = useState(-1)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(audio.align)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json()
      })
      .then((json: unknown) => {
        if (alive) setWords(parseAlignment(json))
      })
      .catch(() => {
        if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [audio.align])

  useEffect(() => {
    if (!el) {
      setPlaying(false)
      return
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    setPlaying(!el.paused && !el.ended)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onPause)
    }
  }, [el])

  useEffect(() => {
    if (el) el.muted = muted
  }, [el, muted])

  useEffect(() => {
    if (el) el.playbackRate = speed
  }, [el, speed])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const current = getActiveAudio()
      if (current && words) {
        const index = wordIndexAt(words.words, current.currentTime * 1000)
        setCurrentWord((prev) => (prev === index ? prev : index))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [words])

  const togglePlay = () => {
    const current = getActiveAudio()
    if (!current) return
    if (current.paused) void current.play().catch(() => {})
    else current.pause()
  }

  const toggleMute = () => {
    const next = !muted
    setMutedState(next)
    setMuted(next)
  }

  const toggleSpeed = () => {
    const next: 1 | 1.25 = speed === 1 ? 1.25 : 1
    setSpeed(next)
    const current = getActiveAudio()
    if (current) current.playbackRate = next
  }

  return (
    <div className="narrator" data-testid="narrator">
      <div className="narrator-controls">
        <button
          type="button"
          className="narrator-btn"
          onClick={togglePlay}
          aria-label={playing ? `Pause narration for ${title}` : `Play narration for ${title}`}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="narrator-btn"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute narration' : 'Mute narration'}
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          className="narrator-btn"
          onClick={toggleSpeed}
          aria-pressed={speed !== 1}
          aria-label="Playback speed"
        >
          {speed}x
        </button>
      </div>
      {error ? <p className="narrator-error">Narration unavailable.</p> : null}
      {words ? (
        <p className="narrator-captions" aria-hidden="true">
          {words.words.map((word, index) => (
            <span
              key={`${index}-${word.text}`}
              className={index === currentWord ? 'narrator-word narrator-word-current' : 'narrator-word'}
            >
              {word.text}{' '}
            </span>
          ))}
        </p>
      ) : null}
      <style>{narratorCss}</style>
    </div>
  )
}

const narratorCss = `
.narrator { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,.1); padding-top: 14px; }
.narrator-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.narrator-btn {
  appearance: none; cursor: pointer; min-height: 36px; padding: 0 12px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--t) 50%, #3d434b); background: transparent; color: #e6e9ec;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.narrator-btn:hover { background: color-mix(in srgb, var(--t) 12%, transparent); }
.narrator-btn:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
.narrator-captions { margin: 0; font-size: 15px; line-height: 1.7; color: #c9d1d6; }
.narrator-word { transition: color .15s ease; }
.narrator-word-current { color: #ffb347; font-weight: 600; }
.narrator-error { margin: 0; font-size: 13px; color: #aab2bb; }
@media (prefers-reduced-motion: reduce) {
  .narrator-word { transition: none; }
}
`
