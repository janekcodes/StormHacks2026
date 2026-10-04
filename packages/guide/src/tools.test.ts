import { describe, expect, it } from 'vitest'
import { GUIDE_TOOL_DECLARATIONS, TOUR_TOOL_NAMES, toolDeclarationsFor } from './tools'

describe('toolDeclarationsFor', () => {
  it('returns every tool by default', () => {
    expect(toolDeclarationsFor()).toEqual(GUIDE_TOOL_DECLARATIONS)
  })
  it('limits tour mode to tools that cannot move the visitor', () => {
    expect(toolDeclarationsFor(TOUR_TOOL_NAMES).map((tool) => tool.name)).toEqual(['highlight', 'getVisitorContext'])
  })
})
