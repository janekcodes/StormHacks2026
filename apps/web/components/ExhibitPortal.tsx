'use client'

import type { ExhibitId } from '@museum/content/schema'
import { portalLoader, type PortalModule } from '@museum/scene/portal'
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'

type PortalView = ComponentType<{ onClose?: () => void }>

const cache = new Map<string, LazyExoticComponent<PortalView>>()

function viewFor(id: ExhibitId): LazyExoticComponent<PortalView> | null {
  const cached = cache.get(id)
  if (cached) return cached
  const load = portalLoader(id)
  if (!load) return null
  const Comp = lazy(() => load().then((mod: PortalModule) => ({ default: mod.Portal })))
  cache.set(id, Comp)
  return Comp
}

export function ExhibitPortal({ id }: { id: ExhibitId }) {
  const Portal = viewFor(id)
  if (!Portal) return null
  return (
    <Suspense fallback={<p>Loading portal...</p>}>
      <Portal />
    </Suspense>
  )
}
