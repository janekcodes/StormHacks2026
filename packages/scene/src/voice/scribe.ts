'use client'

import { CommitStrategy, RealtimeEvents, Scribe } from '@elevenlabs/client'
import type { ConnectScribe } from './controller'

/** How long to wait for the session to become usable before giving up. */
export const OPEN_TIMEOUT_MS = 5000

/**
 * Adapter from the ElevenLabs client SDK to the controller's small interface.
 *
 * `Scribe.connect` returns before the socket is open, and `commit()` throws
 * while it is still connecting. So this resolves only on SESSION_STARTED (the
 * server accepted the session, so the socket is open and commit is safe). The
 * SDK starts the microphone on `open`; a mic failure surfaces afterwards as an
 * ERROR, which the controller treats as fatal. It rejects (closing the
 * connection) if ERROR or CLOSE arrives first, or after OPEN_TIMEOUT_MS.
 */
export const connectScribe: ConnectScribe = async ({ token, modelId }) => {
  const connection = Scribe.connect({
    token,
    modelId,
    commitStrategy: CommitStrategy.MANUAL,
    microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  })

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const settle = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) {
        try {
          connection.close()
        } catch {
          // already closed
        }
        reject(error)
      } else resolve()
    }
    const timer = setTimeout(() => settle(new Error('Scribe session did not open in time')), OPEN_TIMEOUT_MS)
    connection.on(RealtimeEvents.SESSION_STARTED, () => settle())
    connection.on(RealtimeEvents.ERROR, (data) => settle(new Error(`Scribe error before session start: ${JSON.stringify(data)}`)))
    connection.on(RealtimeEvents.CLOSE, () => settle(new Error('Scribe closed before session start')))
  })

  return {
    onPartial: (fn) => connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => fn(data.text)),
    onCommitted: (fn) => connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => fn(data.text)),
    onError: (fn) => connection.on(RealtimeEvents.ERROR, (error) => fn(error)),
    onClose: (fn) => connection.on(RealtimeEvents.CLOSE, () => fn()),
    commit: () => connection.commit(),
    close: () => connection.close()
  }
}
