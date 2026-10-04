import type { ToolCall } from './tools'

/** The result of executing a tool in the browser. */
export interface ToolResponse {
  id: string
  name: string
  result: Record<string, unknown>
}

/**
 * Conversation messages exchanged with the server. The client drives the loop:
 * a `tool` message carries the results of executing the previous turn's tool
 * calls and is re-sent for the next model turn.
 */
export type GuideMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolResponses: ToolResponse[] }

/** Events streamed from `POST /api/guide` as newline-delimited JSON. */
export type GuideEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'error'; error: string }
