'use client'

import type { Exhibit, ExhibitId } from '@museum/content/schema'
import {
  validateToolCall,
  type ToolCall,
  type ToolResponse,
  type VisitorContext
} from '@museum/guide/client'
import { requestOpen } from '../exhibits/open'
import { museum } from '../nav/api'
import { usePlayer } from '../player/usePlayer'
import { usePassport } from '../passport'
import { useGuideStore } from './state'

function builtIdSet(exhibits: readonly Exhibit[]): ReadonlySet<string> {
  return new Set(exhibits.filter((exhibit) => exhibit.tier === 'built').map((exhibit) => exhibit.id))
}

/** Nearest exhibit to a world position, for the visitor context. */
export function nearestExhibitId(
  exhibits: readonly Exhibit[],
  x: number,
  z: number
): ExhibitId | null {
  let best: ExhibitId | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const exhibit of exhibits) {
    const dist = Math.hypot(exhibit.position.x - x, exhibit.position.z - z)
    if (dist < bestDist) {
      bestDist = dist
      best = exhibit.id
    }
  }
  return best
}

/** The visitor state sent with every guide request and read by getVisitorContext. */
export function visitorContext(exhibits: readonly Exhibit[]): VisitorContext {
  const { x, z, zoneKey, zoneName } = usePlayer.getState()
  const { openId, opened } = usePassport.getState()
  return {
    room: zoneName,
    roomKey: zoneKey,
    nearestExhibitId: nearestExhibitId(exhibits, x, z),
    openPortalId: openId,
    visitedIds: opened as ExhibitId[]
  }
}

/** Short human label for a tool call, shown as a chip while it runs. */
export function chipLabel(call: ToolCall): string {
  switch (call.name) {
    case 'walkTo':
      return `Walking to ${String(call.args.exhibitId)}`
    case 'openPortal':
      return `Opening ${String(call.args.exhibitId)}`
    case 'highlight': {
      const ids = call.args.exhibitIds as string[] | undefined
      return ids && ids.length > 0 ? `Highlighting ${ids.join(', ')}` : 'Highlighting'
    }
    case 'startTour':
      return `Starting tour: ${String(call.args.title)}`
    case 'getVisitorContext':
      return 'Checking your location'
  }
}

/**
 * Validate and run one tool call against the scene API. A rejected call is
 * returned to the model as the tool result so it can correct itself.
 */
export function executeToolCall(
  call: ToolCall,
  exhibits: readonly Exhibit[],
  allowed?: readonly string[]
): ToolResponse {
  if (allowed && !allowed.includes(call.name)) {
    return { id: call.id, name: call.name, result: { ok: false, error: `${call.name} is not available during the tour` } }
  }
  const validation = validateToolCall(call, { builtIds: builtIdSet(exhibits) })
  if (!validation.ok) {
    return { id: call.id, name: call.name, result: { ok: false, error: validation.error } }
  }

  const { name, args } = validation.call
  const guide = useGuideStore.getState()

  switch (name) {
    case 'walkTo': {
      const id = args.exhibitId as ExhibitId
      const ok = museum.walkTo(id)
      return {
        id: call.id,
        name,
        result: { ok, message: ok ? `Walking to ${id}` : `Could not walk to ${id}` }
      }
    }
    case 'openPortal': {
      const id = args.exhibitId as ExhibitId
      const ok = requestOpen(id)
      return {
        id: call.id,
        name,
        result: { ok, message: ok ? `Opening ${id}` : `Could not open ${id}` }
      }
    }
    case 'highlight': {
      const ids = args.exhibitIds as ExhibitId[]
      guide.setHighlight(ids)
      return {
        id: call.id,
        name,
        result: { ok: true, message: `Highlighting ${ids.join(', ')}` }
      }
    }
    case 'startTour': {
      const title = args.title as string
      const ids = args.exhibitIds as ExhibitId[]
      guide.startTour(title, ids)
      const first = ids[0]
      if (first) museum.walkTo(first)
      return {
        id: call.id,
        name,
        result: { ok: true, message: `Starting tour: ${title} (${ids.join(', ')})` }
      }
    }
    case 'getVisitorContext': {
      const context = visitorContext(exhibits)
      return {
        id: call.id,
        name,
        result: { ok: true, context }
      }
    }
  }
}
