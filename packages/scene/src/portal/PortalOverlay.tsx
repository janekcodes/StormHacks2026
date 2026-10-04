'use client'

import { tierLabel, type Exhibit, type ExhibitId } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode
} from 'react'
import { Narrator } from '../audio/Narrator'
import { closePortal, showNeighbour } from '../exhibits/open'
import { useGuideStore } from '../guide/state'
import { TourBar } from '../tour/TourBar'
import { useTourStore } from '../tour/store'
import { PASSPORT_TOTAL, passportCount, usePassport } from '../passport'
import { lightInk, useFocusTrap, usePresence } from '../ui'
import { portalLoader, type PortalModule } from './registry'

type PortalView = ComponentType<{ onClose?: () => void }>

const lazyCache = new Map<string, LazyExoticComponent<PortalView>>()

function lazyPortal(id: ExhibitId): LazyExoticComponent<PortalView> | null {
  const cached = lazyCache.get(id)
  if (cached) return cached
  const load = portalLoader(id)
  if (!load) return null
  const Comp = lazy(() => load().then((mod: PortalModule) => ({ default: mod.Portal })))
  lazyCache.set(id, Comp)
  return Comp
}

function plannedNote(exhibit: Exhibit): string {
  if (exhibit.tier === 'open') {
    return 'An open slot reserved for a future milestone. Propose one and it gets a place on the floor plan.'
  }
  return `This exhibit is in scope as ${tierLabel(exhibit.tier)}. Its object and interactive portal have not been built yet. The plinth marks its place in the building.`
}

function PlannedCard({ exhibit }: { exhibit: Exhibit }) {
  return (
    <div className="portal-planned" data-testid="planned-card">
      <div className="portal-planned-id" aria-hidden="true">
        {exhibit.id}
      </div>
      <div className="portal-planned-title">Portal in development</div>
      <p>{plannedNote(exhibit)}</p>
    </div>
  )
}

class PortalErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render(): ReactNode {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

function PortalBody({ exhibit }: { exhibit: Exhibit }) {
  if (exhibit.tier !== 'built') return <PlannedCard exhibit={exhibit} />
  const LazyPortal = lazyPortal(exhibit.id)
  if (!LazyPortal) return <PlannedCard exhibit={exhibit} />
  return (
    <PortalErrorBoundary key={exhibit.id} fallback={<PlannedCard exhibit={exhibit} />}>
      <Suspense
        fallback={
          <p className="portal-loading" role="status">
            <span className="loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Loading portal
          </p>
        }
      >
        <div className="portal-screen" data-testid="portal-slot">
          <LazyPortal onClose={closePortal} />
        </div>
      </Suspense>
    </PortalErrorBoundary>
  )
}

export function PortalOverlay({
  exhibits,
  returnFocus
}: {
  exhibits: readonly Exhibit[]
  returnFocus: HTMLElement | null
}) {
  const openId = usePassport((s) => s.openId)
  const opened = usePassport((s) => s.opened)
  const guideOpen = useGuideStore((s) => s.open)
  const panelRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)
  const current = exhibits.find((item) => item.id === openId)
  const last = useRef<Exhibit | undefined>(current)
  if (current) last.current = current
  const presence = usePresence(Boolean(current))
  const exhibit = current ?? (presence ? last.current : undefined)

  // The tour bar must stay reachable while the visitor plays with the exhibit.
  const touring = useTourStore((s) => s.state.phase !== 'idle' && s.state.phase !== 'done')

  useFocusTrap(panelRef, Boolean(current) && !guideOpen && !touring)

  useEffect(() => {
    if (current) {
      if (!wasOpen.current || !panelRef.current?.contains(document.activeElement)) {
        panelRef.current?.focus()
      }
      wasOpen.current = true
      return
    }
    if (wasOpen.current) {
      wasOpen.current = false
      returnFocus?.focus({ preventScroll: true })
    }
  }, [current, returnFocus])

  useEffect(() => {
    if (!openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closePortal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  if (!exhibit || !presence) return null

  const ink = zoneByCode(exhibit.zone)?.ink ?? '#aab2bb'
  const zone = zoneByCode(exhibit.zone)?.name ?? exhibit.zone
  const count = passportCount(opened)
  const caption =
    exhibit.caption && exhibit.caption.trim() !== ''
      ? exhibit.caption
      : 'Part of the museum curatorial scope. See the floor plan for where it sits.'
  const titleId = `portal-title-${exhibit.id}`

  return (
    <div className="portal-overlay" data-testid="portal-overlay" data-state={presence}>
      <section
        ref={panelRef}
        className="portal-panel"
        role="dialog"
        aria-modal={guideOpen || touring ? undefined : true}
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ ['--t' as string]: ink, ['--t-light' as string]: lightInk(ink) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            closePortal()
          }
        }}
      >
        <div className="portal-inner">
          <div className="portal-head">
            <div className="portal-copy">
              <div className="portal-chips">
                <span className="badge" data-tier={exhibit.tier}>
                  {tierLabel(exhibit.tier)}
                </span>
                <span className="portal-id">
                  {exhibit.id} · {exhibit.year} · {zone}
                </span>
              </div>
              <h2 id={titleId}>{exhibit.title}</h2>
              <p>{caption}</p>
              <p className="portal-passport">
                Passport {count} of {PASSPORT_TOTAL}
              </p>
            </div>
            <div className="portal-actions">
              <button
                type="button"
                className="btn btn--outline-accent"
                data-testid="portal-ask-guide"
                aria-label="Ask the AI guide about this exhibit"
                onClick={() =>
                  useGuideStore.getState().openSeeded(`Tell me about ${exhibit.id} (${exhibit.title}).`)
                }
              >
                Ask the guide
              </button>
              {touring ? null : (
                <>
                  <button
                    type="button"
                    className="btn"
                    aria-label="Previous exhibit in this zone"
                    onClick={() => showNeighbour(exhibits, exhibit.id, -1)}
                  >
                    <span aria-hidden="true">←</span> Prev
                  </button>
                  <button
                    type="button"
                    className="btn"
                    aria-label="Next exhibit in this zone"
                    onClick={() => showNeighbour(exhibits, exhibit.id, 1)}
                  >
                    Next <span aria-hidden="true">→</span>
                  </button>
                </>
              )}
              <button type="button" className="btn btn--primary" data-testid="portal-close" onClick={() => closePortal()}>
                Back to museum <span className="keycap" aria-hidden="true">Esc</span>
              </button>
            </div>
          </div>
          <TourBar variant="inline" exhibits={exhibits} />
          {exhibit.tier === 'built' && exhibit.audio ? (
            <Narrator audio={exhibit.audio} title={exhibit.title} />
          ) : null}
          <PortalBody exhibit={exhibit} />
          {exhibit.tier === 'built' && exhibit.stats && exhibit.stats.length > 0 ? (
            <ul className="portal-stats">
              {exhibit.stats.map((stat) => (
                <li key={`${stat.k}-${stat.v}`}>
                  <span className="portal-stat-k">{stat.k}</span>
                  <span className="portal-stat-v">{stat.v}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  )
}
