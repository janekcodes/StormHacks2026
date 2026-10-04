/**
 * Client-safe surface for the scene and web apps. Everything re-exported here
 * is pure: no `@google/genai`, no filesystem. The server-only surface lives in
 * `@museum/guide` (the package root).
 */
export * from './protocol'
export * from './tools'
export * from './validate'
export * from './context'
