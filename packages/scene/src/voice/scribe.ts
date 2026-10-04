'use client'

import { CommitStrategy, RealtimeEvents, Scribe } from '@elevenlabs/client'
import type { ConnectScribe } from './controller'

/** Adapter from the ElevenLabs client SDK to the controller's small interface. */
export const connectScribe: ConnectScribe = ({ token, modelId }) => {
  const connection = Scribe.connect({
    token,
    modelId,
    commitStrategy: CommitStrategy.MANUAL,
    microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  })
  return {
    onPartial: (fn) => connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => fn(data.text)),
    onCommitted: (fn) => connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => fn(data.text)),
    onError: (fn) => connection.on(RealtimeEvents.ERROR, (error) => fn(error)),
    commit: () => connection.commit(),
    close: () => connection.close()
  }
}
