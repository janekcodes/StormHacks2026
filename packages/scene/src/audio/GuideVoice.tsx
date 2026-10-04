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
        className="guide-voice-toggle"
        onClick={() => setSpeakEnabled(!enabled)}
      >
        {enabled ? 'Speak answers: on' : 'Speak answers: off'}
      </button>
      {speaking && caption ? (
        <p className="guide-voice-caption" data-testid="guide-voice-caption" aria-live="polite">
          {caption}
        </p>
      ) : null}
      {speaking ? (
        <button type="button" className="guide-voice-stop" onClick={stop}>
          Stop
        </button>
      ) : null}
      <style>{guideVoiceCss}</style>
    </div>
  )
}

const guideVoiceCss = `
.guide-voice {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 12px; border-top: 1px solid rgba(255,255,255,.1);
  background: rgba(255,179,71,.04);
}
.guide-voice-toggle {
  appearance: none; cursor: pointer; min-height: 28px; padding: 0 10px; border-radius: 7px;
  border: 1px solid rgba(255,179,71,.5); background: transparent; color: #ffb347;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.guide-voice-toggle:hover { background: rgba(255,179,71,.12); }
.guide-voice-toggle[aria-checked="true"] { background: #ffb347; color: #14181c; }
.guide-voice-caption {
  margin: 0; flex: 1 1 auto; font-size: 12px; line-height: 1.5; color: #c3c9d0;
}
.guide-voice-stop {
  appearance: none; cursor: pointer; min-height: 28px; padding: 0 10px; border-radius: 7px;
  border: 1px solid rgba(255,255,255,.2); background: transparent; color: #eef1f4;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.guide-voice-stop:hover { border-color: #ffb347; color: #ffb347; }
.guide-voice-toggle:focus-visible, .guide-voice-stop:focus-visible {
  outline: 2px solid #ffb347; outline-offset: 2px;
}
`
