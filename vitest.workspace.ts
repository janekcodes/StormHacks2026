import { defineWorkspace } from 'vitest/config'

// Runs every package's unit tests from the repo root. Turbo runs each package's
// own `test` script in CI, so this file is the root-level convenience entry.
export default defineWorkspace([
  'packages/scene',
  'packages/content',
  'packages/guide',
  'packages/portals/*',
  'tools/*'
])
