'use client'

import type { Building } from '@museum/content/plan-schema'
import type { Exhibit, ExhibitId } from '@museum/content/schema'
import type { CSSProperties } from 'react'
import { useExhibitUi } from '../exhibits/ui'
import { useGuideStore } from '../guide/state'
import { FloorMap } from '../map/FloorMap'
import { museum } from '../nav/api'
import { PASSPORT_TOTAL, passportCount, usePassport } from '../passport'
import { TouchControls } from '../player/Controls'
import { usePlayer } from '../player/usePlayer'
import { useTourStore } from '../tour/store'
import { lightInk } from '../ui'
import { NavigateMenu } from './NavigateMenu'

const PUBLIC_AREAS = new Set(['Atr', 'Conc', 'Foyer', 'Shop', 'Outside'])

function ZoneCard({ building }: { building: Building }) {
  const zoneName = usePlayer((s) => s.zoneName)
  const zoneKey = usePlayer((s) => s.zoneKey)
  const ready = usePlayer((s) => s.ready)
  const quality = usePlayer((s) => s.quality)
  const opened = usePassport((s) => s.opened)
  const count = passportCount(opened)

  const ink = building.zones[zoneKey === 'Atr' ? 'P' : zoneKey]?.ink
  const style = ink
    ? ({ '--zone-ink': ink, '--zone-ink-light': lightInk(ink) } as CSSProperties)
    : undefined

  return (
    <div className="museum-glass museum-zone" data-testid="zone-hud" style={style}>
      <div className="museum-kicker">{PUBLIC_AREAS.has(zoneKey) ? 'Public area' : 'Gallery'}</div>
      <div className="museum-zone-name" aria-live="polite">
        {zoneName}
      </div>
      <span className="visually-hidden">
        {ready ? 'ready' : 'loading'} · {quality}
      </span>
      <div className="museum-passport-row">
        <div className="museum-progress" aria-hidden="true">
          <span style={{ width: `${(count / PASSPORT_TOTAL) * 100}%` }} />
        </div>
        <span className="museum-passport" data-testid="passport">
          {count} of {PASSPORT_TOTAL}
          <span className="visually-hidden"> exhibits opened</span>
        </span>
      </div>
    </div>
  )
}

function Toolbar() {
  const zoneKey = usePlayer((s) => s.zoneKey)
  const showMap = usePlayer((s) => s.showMap)
  const toggleMap = usePlayer((s) => s.toggleMap)
  const guideOpen = useGuideStore((s) => s.open)
  const hasTour = useTourStore((s) => s.tour !== null)
  const tourIdle = useTourStore((s) => s.state.phase === 'idle' || s.state.phase === 'done')

  return (
    <div className="museum-toolbar" role="toolbar" aria-label="Museum tools">
      {hasTour && tourIdle ? (
        <button
          type="button"
          className="btn btn--glass"
          data-testid="tour-open"
          onClick={() => useTourStore.getState().dispatch({ type: 'START' })}
        >
          Take the tour
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn--glass museum-guide-btn"
        data-testid="guide-open"
        aria-label="Open the AI guide"
        aria-haspopup="dialog"
        aria-expanded={guideOpen}
        onClick={() => useGuideStore.getState().setOpen(!guideOpen)}
      >
        Guide
      </button>
      <NavigateMenu zoneKey={zoneKey} />
      <button
        type="button"
        className="btn btn--glass"
        aria-pressed={showMap}
        aria-keyshortcuts="M"
        onClick={() => toggleMap()}
      >
        Map
      </button>
    </div>
  )
}

function ExhibitPrompt({ exhibits }: { exhibits: readonly Exhibit[] }) {
  const focusId = useExhibitUi((s) => s.focusId)
  const hoverId = useExhibitUi((s) => s.hoverId)
  const portalOpen = usePassport((s) => s.openId)
  const promptId = hoverId ?? focusId
  const prompt = promptId ? exhibits.find((exhibit) => exhibit.id === promptId) : undefined
  if (!prompt || portalOpen) return null

  return (
    <div className="museum-glass museum-prompt" data-testid="exhibit-prompt">
      <span className="museum-prompt-id">{prompt.id}</span>
      <span className="museum-prompt-title">{prompt.title}</span>
      <span className="museum-prompt-key">
        {hoverId ? (
          'Click to open'
        ) : (
          <>
            <kbd className="keycap">E</kbd> Open
          </>
        )}
      </span>
    </div>
  )
}

function Minimap({ building, exhibits }: { building: Building; exhibits: readonly Exhibit[] }) {
  const showMap = usePlayer((s) => s.showMap)
  const x = usePlayer((s) => s.x)
  const z = usePlayer((s) => s.z)
  const yaw = usePlayer((s) => s.yaw)
  const guideHighlight = useGuideStore((s) => s.highlightIds)
  if (!showMap) return null

  return (
    <div className="museum-glass museum-minimap" data-testid="minimap">
      <div className="museum-minimap-head">
        <span>Floor plan</span>
        <kbd className="keycap" aria-hidden="true">
          M
        </kbd>
      </div>
      <FloorMap
        building={building}
        exhibits={exhibits}
        highlight={guideHighlight}
        player={{ x, z, yaw }}
        compact
        onSelect={(id: ExhibitId) => {
          museum.walkTo(id)
        }}
        onFloorClick={(mx, mz) => {
          museum.goMapPoint(mx, mz)
        }}
      />
    </div>
  )
}

function Help() {
  return (
    <div className="museum-glass museum-help" aria-hidden="true">
      <span className="only-pointer">
        <kbd className="keycap">W</kbd>
        <kbd className="keycap">A</kbd>
        <kbd className="keycap">S</kbd>
        <kbd className="keycap">D</kbd> walk
      </span>
      <span className="only-pointer">
        <kbd className="keycap">←</kbd>
        <kbd className="keycap">→</kbd> turn
      </span>
      <span className="only-pointer">
        <kbd className="keycap">Shift</kbd> hurry
      </span>
      <span className="only-pointer">drag to look</span>
      <span className="only-pointer">
        <kbd className="keycap">E</kbd> open
      </span>
      <span className="only-pointer">
        <kbd className="keycap">M</kbd> map
      </span>
      <span className="only-touch">Pad to walk, drag to look, tap a case to open it</span>
    </div>
  )
}

export function Hud({ building, exhibits }: { building: Building; exhibits: readonly Exhibit[] }) {
  return (
    <>
      <div className="museum-left">
        <ZoneCard building={building} />
        <Toolbar />
      </div>
      <ExhibitPrompt exhibits={exhibits} />
      <div className="museum-crosshair" aria-hidden="true" />
      <TouchControls />
      <Minimap building={building} exhibits={exhibits} />
      <Help />
    </>
  )
}
