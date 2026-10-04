'use client'

import type { ExhibitId } from '@museum/content/schema'
import { portalLoader, type PortalModule } from '@museum/scene/portal'
import { Component, lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'

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

function PortalFallback({ children }: { children: ReactNode }) {
  return (
    <div className="portal-fallback" role="status">
      {children}
    </div>
  )
}

class PortalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <PortalFallback>
          <p className="portal-fallback-title">This portal could not start</p>
          <p>Reload the page to try again, or open the exhibit in the museum.</p>
        </PortalFallback>
      )
    }
    return this.props.children
  }
}

export function ExhibitPortal({ id }: { id: ExhibitId }) {
  const Portal = viewFor(id)
  if (!Portal) return null
  return (
    <PortalBoundary>
      <Suspense
        fallback={
          <PortalFallback>
            <span className="loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <p>Loading portal</p>
          </PortalFallback>
        }
      >
        <Portal />
      </Suspense>
    </PortalBoundary>
  )
}
