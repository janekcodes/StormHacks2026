'use client'

import { useSyncExternalStore } from 'react'
import {
  getCaption,
  isSpeaking,
  isSpeakEnabled,
  setSpeakEnabled,
  stop,
  subscribe
} from './guideVoiceBus'

const serverEnabled = false
const serverSpeaking = false
const serverCaption = null

/**
 * Opt-in guide speech controls: a "Speak answers" toggle plus the current
 * spoken sentence as a caption and a Stop button. Playback itself lives in
 * `guideVoiceBus`; this component only renders its state.
 */
export function GuideVoice() {
  const enabled = useSyncExternalStore(subscribe, isSpeakEnabled, () => serverEnabled)
  const speaking = useSyncExternalStore(subscribe, isSpeaking, () => serverSpeaking)
  const caption = useSyncExternalStore(subscribe, getCaption, () => serverCaption)

  return (
    <div className="guide-voice" data-testid="guide-voice">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Speak answers"
        className="btn guide-voice-toggle"
        onClick={() => setSpeakEnabled(!enabled)}
      >
        {enabled ? 'Speak answers: on' : 'Speak answers: off'}
      </button>
      {caption ? (
        <p className="guide-voice-caption" data-testid="guide-voice-caption" aria-live="polite">
          {caption}
        </p>
      ) : null}
      {speaking || caption ? (
        <button type="button" className="btn" aria-label="Stop" onClick={stop}>
          Stop
        </button>
      ) : null}
    </div>
  )
}
