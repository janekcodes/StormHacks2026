import type { VoiceStatus } from '../voice/controller'
import type { PauseReason } from './machine'

export interface TourCaptionInput {
  pauseReason: PauseReason | null
  /** Live partial transcript while the visitor holds to ask. */
  partial: string
  voiceStatus: VoiceStatus
  /** The guide sentence being spoken (guideVoiceBus), if any. */
  guideCaption: string | null
  /** True while the guide's answer is still streaming. */
  thinking: boolean
  /** The tour's own line (stop lines, the fallback). */
  tourCaption: string | null
}

/**
 * The single caption line of the tour bar. Every spoken line needs on-screen
 * text (BLUEPRINT accessibility and captions), including the guide's answers,
 * whose own caption only renders inside the guide panel.
 */
export function tourCaption(input: TourCaptionInput): string | null {
  if (input.pauseReason === 'listening') {
    // Until the session is live nothing is heard, so do not invite speech yet.
    return input.partial || (input.voiceStatus === 'idle' ? 'Starting the mic' : 'Listening')
  }
  if (input.guideCaption) return input.guideCaption
  if (input.pauseReason === 'answering' && input.thinking) return 'Thinking'
  return input.tourCaption
}
