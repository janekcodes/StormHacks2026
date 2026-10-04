'use client'

import type { Exhibit, ExhibitId, Tier } from '@museum/content/schema'
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
import { PASSPORT_TOTAL, passportCount, usePassport } from '../passport'
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

function tierLabel(tier: Tier): string {
  if (tier === 'built') return 'Built'
  if (tier === 'core') return 'Core'
  if (tier === 'extended') return 'Extended'
  return 'Open slot'
}

function plannedNote(exhibit: Exhibit): string {
  if (exhibit.tier === 'open') {
    return 'An open slot reserved for a future milestone. Propose one and it gets a place on the floor plan.'
  }
  return `This exhibit is in scope as ${tierLabel(exhibit.tier)}. Its object and interactive portal have not been built yet. The plinth marks its place in the building.`
}

function PlannedCard({ exhibit, ink }: { exhibit: Exhibit; ink: string }) {
  return (
    <div className="portal-planned" data-testid="planned-card">
      <div className="portal-planned-id" style={{ color: ink }}>
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

function PortalBody({ exhibit, ink }: { exhibit: Exhibit; ink: string }) {
  if (exhibit.tier !== 'built') return <PlannedCard exhibit={exhibit} ink={ink} />
  const LazyPortal = lazyPortal(exhibit.id)
  if (!LazyPortal) return <PlannedCard exhibit={exhibit} ink={ink} />
  return (
    <PortalErrorBoundary key={exhibit.id} fallback={<PlannedCard exhibit={exhibit} ink={ink} />}>
      <Suspense fallback={<p className="portal-loading">Loading portal...</p>}>
        <div data-testid="portal-slot">
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
  const panelRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)
  const exhibit = exhibits.find((item) => item.id === openId)

  useEffect(() => {
    if (exhibit) {
      wasOpen.current = true
      panelRef.current?.focus()
      return
    }
    if (wasOpen.current) {
      wasOpen.current = false
      returnFocus?.focus({ preventScroll: true })
    }
  }, [exhibit, returnFocus])

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

  if (!exhibit) return null

  const ink = zoneByCode(exhibit.zone)?.ink ?? '#e6e9ec'
  const zone = zoneByCode(exhibit.zone)?.name ?? exhibit.zone
  const count = passportCount(opened)
  const caption =
    exhibit.caption && exhibit.caption.trim() !== ''
      ? exhibit.caption
      : 'Part of the museum curatorial scope. See the floor plan for where it sits.'

  return (
    <div className="portal-overlay" data-testid="portal-overlay">
      <section
        ref={panelRef}
        className="portal-panel"
        tabIndex={-1}
        style={{ ['--t' as string]: ink }}
        aria-label={`Exhibit portal: ${exhibit.title}`}
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
                <span className="portal-chip">{tierLabel(exhibit.tier)}</span>
                <span className="portal-id">
                  {exhibit.id} · {exhibit.year} · {zone}
                </span>
              </div>
              <h2>{exhibit.title}</h2>
              <p>{caption}</p>
              <p className="portal-passport">
                {count} of {PASSPORT_TOTAL}
              </p>
            </div>
            <div className="portal-actions">
              <button
                type="button"
                className="portal-btn portal-btn-guide"
                data-testid="portal-ask-guide"
                aria-label="Ask the AI guide about this exhibit"
                onClick={() =>
                  useGuideStore.getState().openSeeded(`Tell me about ${exhibit.id} (${exhibit.title}).`)
                }
              >
                Ask the guide
              </button>
              <button
                type="button"
                className="portal-btn"
                aria-label="Previous exhibit in this zone"
                onClick={() => showNeighbour(exhibits, exhibit.id, -1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="portal-btn"
                aria-label="Next exhibit in this zone"
                onClick={() => showNeighbour(exhibits, exhibit.id, 1)}
              >
                Next
              </button>
              <button
                type="button"
                className="portal-btn portal-btn-close"
                data-testid="portal-close"
                onClick={() => closePortal()}
              >
                Back to museum · Esc
              </button>
            </div>
          </div>
          {exhibit.tier === 'built' && exhibit.audio ? (
            <Narrator audio={exhibit.audio} title={exhibit.title} />
          ) : null}
          <PortalBody exhibit={exhibit} ink={ink} />
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
      <style>{overlayCss}</style>
    </div>
  )
}

const overlayCss = `
.portal-overlay {
  position: absolute; inset: 0; z-index: 6; overflow-y: auto;
  background: rgba(6,7,9,.8); padding: 24px 16px; box-sizing: border-box;
}
.portal-panel {
  position: relative; max-width: 1120px; margin: 0 auto; border-radius: 14px;
  background: #07090a; border: 1px solid var(--t); outline: none; color: #e6e9ec;
  box-shadow: 0 0 50px color-mix(in srgb, var(--t) 28%, transparent);
}
.portal-panel:focus-visible { box-shadow: 0 0 0 2px #ffb347; }
.portal-inner { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.portal-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 14px; }
.portal-copy { min-width: 0; flex: 1 1 420px; display: flex; flex-direction: column; gap: 8px; }
.portal-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.portal-chip {
  display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--t); color: var(--t);
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase;
}
.portal-id { font-family: "IBM Plex Mono", monospace; font-size: 14px; color: var(--t); }
.portal-copy h2 {
  margin: 0; font-family: "Chakra Petch", sans-serif; font-weight: 700;
  font-size: 34px; line-height: 1.05; color: #f4f7f8;
}
.portal-copy p { margin: 0; font-size: 14px; line-height: 1.6; color: #c9d1d6; max-width: 760px; }
.portal-passport {
  color: #ffb347 !important; font-family: "Chakra Petch", sans-serif;
  letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px !important;
}
.portal-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
.portal-btn {
  appearance: none; cursor: pointer; min-height: 44px; padding: 0 14px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--t) 50%, #3d434b); background: transparent; color: #e6e9ec;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.portal-btn:hover { background: color-mix(in srgb, var(--t) 12%, transparent); }
.portal-btn:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
.portal-btn-close { border-color: var(--t); color: var(--t); }
.portal-btn-guide { border-color: #ffb347; color: #ffb347; }
.portal-planned {
  border-radius: 10px; border: 1px dashed color-mix(in srgb, var(--t) 50%, transparent);
  padding: 36px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px;
  text-align: center; background: #0b0d0e;
}
.portal-planned-id { font-family: "IBM Plex Mono", monospace; font-size: 64px; line-height: 1; }
.portal-planned-title { font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 18px; color: #e6e9ec; }
.portal-planned p { margin: 0; font-size: 13px; line-height: 1.6; color: #aab2bb; max-width: 520px; }
.portal-loading { margin: 0; color: #aab2bb; font-size: 13px; }
.portal-stats {
  list-style: none; margin: 0; padding: 0; display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;
}
.portal-stats li {
  border: 1px solid color-mix(in srgb, var(--t) 28%, transparent); border-radius: 8px;
  padding: 10px 14px; background: #0b0d0e; display: flex; flex-direction: column; gap: 4px;
}
.portal-stat-k {
  font-family: "Chakra Petch", sans-serif; font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: #8b939c;
}
.portal-stat-v { font-family: "IBM Plex Mono", monospace; font-size: 22px; line-height: 1.1; color: var(--t); }
@media (prefers-reduced-motion: reduce) {
  .portal-overlay, .portal-panel { animation: none; }
}
`
