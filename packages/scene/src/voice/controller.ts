export interface ScribeConnection {
  onPartial(fn: (text: string) => void): void
  onCommitted(fn: (text: string) => void): void
  onError(fn: (error: unknown) => void): void
  commit(): void
  close(): void
}

export type ConnectScribe = (opts: { token: string; modelId: string }) => ScribeConnection
export type VoiceStatus = 'idle' | 'listening' | 'finishing' | 'unavailable'

export const MIN_WORDS = 2

export interface VoiceControllerDeps {
  getToken: () => Promise<{ token: string; modelId: string }>
  connect: ConnectScribe
  onPartial: (text: string) => void
  onStatus: (status: VoiceStatus) => void
  finalTimeoutMs?: number
}

/**
 * Push-to-talk over a realtime Scribe session. Press opens a session with a
 * single-use token; release commits, waits briefly for the final transcript,
 * and closes. Any failure marks the controller unavailable so the UI can
 * switch to a text box.
 */
export function createVoiceController(deps: VoiceControllerDeps) {
  const finalTimeoutMs = deps.finalTimeoutMs ?? 1500
  let pending: Promise<{ token: string; modelId: string }> | null = null
  let conn: ScribeConnection | null = null
  let partial = ''
  let committed: string[] = []
  let onCommit: (() => void) | null = null
  let unavailable = false

  const status = (next: VoiceStatus) => deps.onStatus(next)

  const fail = () => {
    unavailable = true
    conn?.close()
    conn = null
    status('unavailable')
  }

  const takeToken = () => {
    const token = pending ?? deps.getToken()
    pending = null
    return token
  }

  const refill = () => {
    pending = deps.getToken()
    pending.catch(() => {
      pending = null
    })
  }

  return {
    prefetch() {
      if (!pending && !unavailable) refill()
    },
    async start() {
      if (conn || unavailable) return
      partial = ''
      committed = []
      try {
        const { token, modelId } = await takeToken()
        const next = deps.connect({ token, modelId })
        conn = next
        next.onPartial((text) => {
          partial = text
          deps.onPartial(text)
        })
        next.onCommitted((text) => {
          if (text.trim()) committed.push(text.trim())
          onCommit?.()
        })
        next.onError(() => fail())
        status('listening')
        refill()
      } catch {
        fail()
      }
    },
    async stop(): Promise<string | null> {
      const active = conn
      if (!active) return null
      status('finishing')
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, finalTimeoutMs)
        onCommit = () => {
          clearTimeout(timer)
          resolve()
        }
        active.commit()
      })
      onCommit = null
      active.close()
      conn = null
      if (!unavailable) status('idle')
      const text = (committed.length > 0 ? committed.join(' ') : partial).trim()
      return text.split(/\s+/).filter(Boolean).length >= MIN_WORDS ? text : null
    },
    dispose() {
      conn?.close()
      conn = null
    }
  }
}
