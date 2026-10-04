import { GUIDE_TOOL_NAMES, toolArgumentSchema, type GuideToolName, type ToolCall } from './tools'

export type ValidationResult =
  | { ok: true; call: ToolCall }
  | { ok: false; error: string }

export interface ValidateOptions {
  /**
   * IDs of built exhibits. When provided, `openPortal` on a non-built exhibit
   * is rejected so a planned exhibit is never opened as a demo.
   */
  builtIds?: ReadonlySet<string>
}

function isGuideToolName(value: string): value is GuideToolName {
  return (GUIDE_TOOL_NAMES as readonly string[]).includes(value)
}

/**
 * Validate one tool call before it is executed. Returns a corrected call or an
 * error message suitable for returning to the model as the tool result.
 */
export function validateToolCall(call: unknown, options: ValidateOptions = {}): ValidationResult {
  if (typeof call !== 'object' || call === null) {
    return { ok: false, error: 'tool call must be an object' }
  }

  const record = call as Record<string, unknown>
  const name = record.name
  if (typeof name !== 'string' || !isGuideToolName(name)) {
    return { ok: false, error: `unknown tool: ${String(name)}` }
  }

  const parsed = toolArgumentSchema(name).safeParse(record.args ?? {})
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : 'args'}: ${issue.message}`)
      .join('; ')
    return { ok: false, error: `invalid arguments for ${name}: ${issues}` }
  }

  const args = parsed.data as Record<string, unknown>

  if (name === 'openPortal' && options.builtIds) {
    const exhibitId = args.exhibitId as string
    if (!options.builtIds.has(exhibitId)) {
      return {
        ok: false,
        error: `${exhibitId} is planned, not on display, and has no portal to open`
      }
    }
  }

  const result: ToolCall = {
    id: typeof record.id === 'string' ? record.id : '',
    name,
    args
  }
  if (typeof record.thoughtSignature === 'string') {
    result.thoughtSignature = record.thoughtSignature
  }

  return {
    ok: true,
    call: result
  }
}
