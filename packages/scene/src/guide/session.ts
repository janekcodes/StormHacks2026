'use client'

let sessionId = ''

/**
 * A stable anonymous session id shared by the guide and speak routes so text
 * questions and spoken sentences count against the same per-session budget.
 */
export function getSessionId(): string {
  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `museum-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
  return sessionId
}
