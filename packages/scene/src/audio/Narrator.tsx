'use client'

import type { ExhibitAudio } from '@museum/content/schema'
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react'
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

/** Index of the sentence each word belongs to; a word ending in . ? or ! closes a sentence. */
export function sentenceIndexes(words: readonly { text: string }[]): number[] {
  const out: number[] = []
  let sentence = 0
  for (const word of words) {
    out.push(sentence)
    if (/[.?!]["')\]]*$/.test(word.text)) sentence++
  }
  return out
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
  const [shownSentence, setShownSentence] = useState(0)
  const [transcript, setTranscript] = useState(false)
  const [error, setError] = useState(false)
  const transcriptId = useId()
  const sentenceOf = useMemo(() => (words ? sentenceIndexes(words.words) : []), [words])

  // Between words (index -1) the strip keeps the last sentence instead of blanking.
  useEffect(() => {
    const sentence = sentenceOf[currentWord]
    if (sentence !== undefined) setShownSentence(sentence)
  }, [currentWord, sentenceOf])

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

  const renderWord = (word: AlignmentFile['words'][number], index: number) => (
    <span
      key={`${index}-${word.text}`}
      className={index === currentWord ? 'narrator-word narrator-word-current' : 'narrator-word'}
    >
      {word.text}{' '}
    </span>
  )

  return (
    <div className="narrator" data-testid="narrator" data-transcript={transcript ? 'open' : 'closed'}>
      <div className="narrator-bar">
        <div className="narrator-controls">
          <button
            type="button"
            className="btn"
            onClick={togglePlay}
            aria-label={playing ? `Pause narration for ${title}` : `Play narration for ${title}`}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute narration' : 'Mute narration'}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={toggleSpeed}
            aria-pressed={speed !== 1}
            aria-label="Playback speed"
          >
            {speed}x
          </button>
        </div>
        {words && !transcript ? (
          <p className="narrator-strip" data-testid="narrator-strip" aria-hidden="true">
            {words.words.map((word, index) => (sentenceOf[index] === shownSentence ? renderWord(word, index) : null))}
          </p>
        ) : null}
        {words ? (
          <button
            type="button"
            className="btn narrator-toggle"
            aria-expanded={transcript}
            aria-controls={transcriptId}
            onClick={() => setTranscript((open) => !open)}
          >
            {transcript ? 'Hide transcript' : 'Transcript'}
          </button>
        ) : null}
      </div>
      {error ? <p className="narrator-error">Narration unavailable.</p> : null}
      {words ? (
        <p id={transcriptId} className="narrator-captions" hidden={!transcript}>
          {words.words.map(renderWord)}
        </p>
      ) : null}
    </div>
  )
}
