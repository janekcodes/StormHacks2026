import type { Exhibit, ExhibitId } from '@museum/content/schema'

/** What the browser sends with every guide request (BLUEPRINT section 11). */
export interface VisitorContext {
  room: string
  roomKey: string
  nearestExhibitId: ExhibitId | null
  openPortalId: ExhibitId | null
  visitedIds: ExhibitId[]
}

/** Full content for the open or nearest exhibit only. */
export type ExhibitDetail = Pick<
  Exhibit,
  | 'id'
  | 'year'
  | 'title'
  | 'zone'
  | 'band'
  | 'tier'
  | 'caption'
  | 'hook'
  | 'stats'
  | 'sources'
  | 'caveat'
>

/**
 * Build the per-request context text: the visitor's position plus the full
 * detail for the open or nearest exhibit. No vector store; the whole
 * collection fits in context.
 */
export function buildContext(visitor: VisitorContext, detail: ExhibitDetail | null): string {
  const lines: string[] = []
  lines.push(`Visitor room: ${visitor.room} (key ${visitor.roomKey})`)
  lines.push(`Nearest exhibit: ${visitor.nearestExhibitId ?? 'none'}`)
  lines.push(`Open portal: ${visitor.openPortalId ?? 'none'}`)
  lines.push(`Visited exhibits: ${visitor.visitedIds.length > 0 ? visitor.visitedIds.join(', ') : 'none'}`)

  if (detail) {
    lines.push('')
    lines.push(`Focused exhibit: ${detail.id} | ${detail.year} | ${detail.title} | tier ${detail.tier}`)
    if (detail.hook) lines.push(`Hook: ${detail.hook}`)
    if (detail.caption) lines.push(`Caption: ${detail.caption}`)
    if (detail.stats && detail.stats.length > 0) {
      lines.push(`Stats: ${detail.stats.map((stat) => `${stat.k}: ${stat.v}`).join('; ')}`)
    }
    if (detail.caveat) lines.push(`Caveat: ${detail.caveat}`)
  }

  return lines.join('\n')
}
