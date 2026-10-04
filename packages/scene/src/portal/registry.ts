import type { ComponentType } from 'react'
import type { ExhibitId } from '@museum/content/schema'

export interface PortalModule {
  id: string
  meta: { id: string; title: string; year: string }
  Portal: ComponentType<{ onClose?: () => void }>
}

export type PortalLoader = () => Promise<PortalModule>

/**
 * Built exhibits only. Each import is its own chunk and runs when that portal opens.
 * Unbuilt ids are absent so the overlay shows the planned card.
 */
export const portalLoaders: Partial<Record<ExhibitId, PortalLoader>> = {
  A1: () => import('@museum/portal-a1'),
  B2: () => import('@museum/portal-b2'),
  B3: () => import('@museum/portal-b3'),
  B11: () => import('@museum/portal-b11'),
  C1: () => import('@museum/portal-c1'),
  C3: () => import('@museum/portal-c3'),
  C10: () => import('@museum/portal-c10'),
  D6: () => import('@museum/portal-d6'),
  D7: () => import('@museum/portal-d7'),
  E3: () => import('@museum/portal-e3'),
  F2: () => import('@museum/portal-f2'),
  F7: () => import('@museum/portal-f7'),
  F10: () => import('@museum/portal-f10')
}

export function portalLoader(id: ExhibitId): PortalLoader | null {
  return portalLoaders[id] ?? null
}
