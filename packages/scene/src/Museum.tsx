'use client'

import type { Building } from '@museum/content/plan-schema'
import type { Exhibit, ExhibitId } from '@museum/content/schema'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { registerExhibitAudio } from './audio/narratorBus'
import { Atrium } from './building/Atrium'
import { Floors } from './building/Floors'
import { Signage } from './building/Signage'
import { Walls } from './building/Walls'
import { Exhibits } from './exhibits/Exhibits'
import { requestOpen } from './exhibits/open'
import { SpotPool } from './exhibits/SpotPool'
import { useExhibitUi } from './exhibits/ui'
import { GuidePanel } from './guide/GuidePanel'
import { useGuideStore } from './guide/state'
import { Lighting } from './lighting/Lighting'
import { FloorMap } from './map/FloorMap'
import { bindMuseumApi, museum, setMapBuilding } from './nav/api'
import { PASSPORT_TOTAL, passportCount, usePassport } from './passport'
import { PortalOverlay } from './portal/PortalOverlay'
import { ROOM_JUMP_ORDER, roomJumpLabel, setStandpoints, type StandpointsData } from './nav/targets'
import { TravelDriver } from './nav/travel'
import { disposeNav, loadNavMesh } from './nav/useNav'
import { Controls, TouchControls } from './player/Controls'
import { usePlayer } from './player/usePlayer'
import { detectQuality, settingsFor, type QualityTier } from './quality'

export interface MuseumProps {
  building: Building
  exhibits: readonly Exhibit[]
  standpoints: StandpointsData
  /** URL for the committed navmesh binary (default `/navmesh.bin`). */
  navmeshUrl?: string
  /** Deep link: walk to this exhibit and open its portal once the navmesh is ready. */
  initialExhibit?: ExhibitId | null
}

function SceneReady() {
  const setReady = usePlayer((s) => s.setReady)
  useEffect(() => {
    setReady(true)
    return () => setReady(false)
  }, [setReady])
  return null
}

function DrawCallProbe() {
  const { gl } = useThree()
  useFrame(() => {
    const el = document.querySelector('.museum-view')
    if (!el) return
    const player = usePlayer.getState()
    const ui = useExhibitUi.getState()
    el.setAttribute('data-draw-calls', String(gl.info.render.calls))
    el.setAttribute('data-player-x', player.x.toFixed(2))
    el.setAttribute('data-player-z', player.z.toFixed(2))
    el.setAttribute('data-focus', ui.focusId ?? '')
    el.setAttribute('data-hover', ui.hoverId ?? '')
    el.setAttribute('data-open', usePassport.getState().openId ?? '')
  })
  return null
}

function SceneBody({
  building,
  exhibits,
  quality,
  container
}: {
  building: Building
  exhibits: readonly Exhibit[]
  quality: QualityTier
  container: HTMLElement | null
}) {
  return (
    <>
      <Lighting quality={quality} />
      <Floors building={building} />
      <Walls building={building} />
      <Atrium building={building} />
      <Signage building={building} />
      <Exhibits building={building} exhibits={exhibits} />
      <SpotPool exhibits={exhibits} />
      <TravelDriver />
      <Controls building={building} exhibits={exhibits} container={container} />
      <DrawCallProbe />
      <SceneReady />
    </>
  )
}

function Hud({ building, exhibits }: { building: Building; exhibits: readonly Exhibit[] }) {
  const zoneName = usePlayer((s) => s.zoneName)
  const zoneKey = usePlayer((s) => s.zoneKey)
  const showMap = usePlayer((s) => s.showMap)
  const x = usePlayer((s) => s.x)
  const z = usePlayer((s) => s.z)
  const yaw = usePlayer((s) => s.yaw)
  const ready = usePlayer((s) => s.ready)
  const quality = usePlayer((s) => s.quality)
  const opened = usePassport((s) => s.opened)
  const focusId = useExhibitUi((s) => s.focusId)
  const hoverId = useExhibitUi((s) => s.hoverId)
  const portalOpen = usePassport((s) => s.openId)
  const promptId = hoverId ?? focusId
  const prompt = promptId ? exhibits.find((exhibit) => exhibit.id === promptId) : undefined
  const guideHighlight = useGuideStore((s) => s.highlightIds)
  const [navOpen, setNavOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!navOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [navOpen])

  const kicker =
    zoneKey === 'Atr' ||
    zoneKey === 'Conc' ||
    zoneKey === 'Foyer' ||
    zoneKey === 'Shop' ||
    zoneKey === 'Outside'
      ? 'Public area'
      : 'Gallery'

  const zoneInk = building.zones[zoneKey === 'Atr' ? 'P' : zoneKey]?.ink

  return (
    <>
      <div className="museum-left">
        <div
          className="museum-hud museum-zone"
          data-testid="zone-hud"
          style={zoneInk ? { borderLeftColor: zoneInk, borderLeftWidth: 3 } : undefined}
        >
          <div className="museum-kicker">{kicker}</div>
          <div className="museum-zone-name">{zoneName}</div>
          <div className="museum-meta">
            {ready ? 'ready' : 'loading'} · {quality}
          </div>
          <div className="museum-passport" data-testid="passport">
            {passportCount(opened)} of {PASSPORT_TOTAL}
          </div>
        </div>
        <div className="museum-toolbar">
          <button
            type="button"
            className="museum-btn museum-btn-guide"
            data-testid="guide-open"
            aria-label="Open the AI guide"
            onClick={() => useGuideStore.getState().setOpen(true)}
          >
            Guide
          </button>
          <div className="museum-nav" ref={navRef}>
            <button
              type="button"
              className="museum-btn"
              aria-haspopup="menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
            >
              Navigate
            </button>
            {navOpen ? (
              <ul className="museum-nav-menu" role="menu" aria-label="Jump to room">
                {ROOM_JUMP_ORDER.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      role="menuitem"
                      className={key === zoneKey ? 'museum-nav-item museum-nav-item-here' : 'museum-nav-item'}
                      onClick={() => {
                        museum.goRoom(key)
                        setNavOpen(false)
                      }}
                    >
                      {roomJumpLabel(key)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      {prompt && !portalOpen ? (
        <div className="museum-prompt" data-testid="exhibit-prompt">
          <span className="museum-prompt-id">{prompt.id}</span>
          <span className="museum-prompt-title">{prompt.title}</span>
          <span className="museum-prompt-key">{hoverId ? 'Click' : 'E · open'}</span>
        </div>
      ) : null}
      <div className="museum-crosshair" aria-hidden="true" />
      <TouchControls />
      {showMap ? (
        <div className="museum-minimap" data-testid="minimap">
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
      ) : null}
      <div className="museum-help">
        W A S D / arrows move · Q or left/right turn · Shift run · Drag look · click an exhibit or E · M map
      </div>
    </>
  )
}

function qualityFromQuery(): QualityTier | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('quality')
  if (value === 'high' || value === 'balanced' || value === 'low') return value
  return null
}

export function Museum({
  building,
  exhibits,
  standpoints,
  navmeshUrl = '/navmesh.bin',
  initialExhibit = null
}: MuseumProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [quality, setQuality] = useState<QualityTier | null>(null)
  const [navReady, setNavReady] = useState(false)
  const setStoreQuality = usePlayer((s) => s.setQuality)
  const ready = usePlayer((s) => s.ready)
  const openId = usePassport((s) => s.openId)
  const linked = useRef<string | null>(null)

  useEffect(() => {
    setStandpoints(standpoints)
  }, [standpoints])

  useEffect(() => {
    registerExhibitAudio(exhibits)
  }, [exhibits])

  useEffect(() => {
    setMapBuilding(building)
    bindMuseumApi(true)
    return () => {
      setMapBuilding(null)
      bindMuseumApi(false)
    }
  }, [building])

  useEffect(() => {
    const forced = qualityFromQuery()
    if (forced) {
      setQuality(forced)
      setStoreQuality(forced)
      return
    }
    let alive = true
    detectQuality().then((q) => {
      if (!alive) return
      setQuality(q)
      setStoreQuality(q)
    })
    return () => {
      alive = false
    }
  }, [setStoreQuality])

  useEffect(() => {
    if (!initialExhibit || !ready || !navReady) return
    if (linked.current === initialExhibit) return
    linked.current = initialExhibit
    requestOpen(initialExhibit)
  }, [initialExhibit, navReady, ready])

  useEffect(() => {
    let alive = true
    setNavReady(false)
    fetch(navmeshUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`navmesh fetch failed: ${r.status}`)
        return r.arrayBuffer()
      })
      .then((buf) => loadNavMesh(buf))
      .then(() => {
        if (alive) setNavReady(true)
      })
      .catch((err: unknown) => {
        console.error(err)
        if (alive) setNavReady(false)
      })
    return () => {
      alive = false
      disposeNav()
    }
  }, [navmeshUrl])

  const settings = quality ? settingsFor(quality) : null
  const sceneReady = ready && navReady

  return (
    <div
      ref={setContainer}
      className="museum-view"
      tabIndex={0}
      role="application"
      aria-label="3D museum building. W A S D or arrow keys to move and turn, drag to look, click an exhibit or press E to open it, M toggles the map."
      data-ready={sceneReady ? 'true' : 'false'}
      data-nav={navReady ? 'true' : 'false'}
      data-exhibit-count={exhibits.length}
      data-quality={settings?.tier ?? ''}
      data-paused={openId ? 'true' : 'false'}
    >
      {settings ? (
        <Canvas
          frameloop={openId ? 'never' : 'always'}
          shadows={settings.shadows}
          dpr={settings.dpr}
          camera={{ fov: 62, near: 0.05, far: 260, position: [0, 1.65, 34.5] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <SceneBody
              building={building}
              exhibits={exhibits}
              quality={settings.tier}
              container={container}
            />
          </Suspense>
        </Canvas>
      ) : (
        <div className="museum-loading">Detecting GPU…</div>
      )}
      <Hud building={building} exhibits={exhibits} />
      <PortalOverlay exhibits={exhibits} returnFocus={container} />
      <GuidePanel exhibits={exhibits} />
      <style>{museumCss}</style>
    </div>
  )
}

const museumCss = `
.museum-view {
  position: relative;
  width: 100%;
  height: min(100vh, 900px);
  min-height: 520px;
  outline: none;
  overflow: hidden;
  background: #dfe6ea;
  border: 1px solid #2e3339;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  color: #eef1f4;
}
.museum-view:focus-visible { box-shadow: 0 0 0 2px #ffb347; }
.museum-view canvas { display: block; width: 100% !important; height: 100% !important; touch-action: none; cursor: grab; }
.museum-view canvas.hot { cursor: pointer; }
.museum-loading {
  display: grid; place-items: center; height: 100%;
  color: #5b6168; font-family: "Chakra Petch", sans-serif; letter-spacing: 0.08em; text-transform: uppercase;
}
.museum-hud {
  pointer-events: none; z-index: 2;
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.12); border-radius: 10px; color: #eef1f4;
}
.museum-left {
  position: absolute; left: 14px; top: 14px; z-index: 3;
  display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.museum-zone { padding: 8px 12px; max-width: 360px; }
.museum-toolbar { display: flex; flex-wrap: wrap; gap: 6px; pointer-events: auto; }
.museum-kicker {
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: #ffb347;
}
.museum-zone-name {
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 18px; margin-top: 2px;
}
.museum-meta { font-size: 11px; color: #aab2bb; margin-top: 4px; }
.museum-passport {
  margin-top: 6px; font-family: "Chakra Petch", sans-serif; font-weight: 700;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #ffb347;
}
.museum-prompt {
  position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 2;
  display: flex; align-items: center; gap: 12px; padding: 10px 16px; white-space: nowrap;
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.12); border-radius: 10px; pointer-events: none;
}
.museum-prompt-id { font-family: "IBM Plex Mono", monospace; color: #ffb347; }
.museum-prompt-title { font-family: "Chakra Petch", sans-serif; font-weight: 700; }
.museum-prompt-key {
  font-size: 11px; color: #aab2bb; border: 1px solid #4a5058; border-radius: 4px; padding: 2px 6px;
}
.museum-crosshair {
  position: absolute; left: 50%; top: 50%; width: 6px; height: 6px;
  margin: -3px 0 0 -3px; border-radius: 50%;
  background: rgba(255,255,255,.85); box-shadow: 0 0 0 1px rgba(0,0,0,.4); z-index: 2; pointer-events: none;
}
.museum-touch {
  position: absolute; right: 14px; bottom: 14px; display: flex; gap: 6px; flex-wrap: wrap;
  justify-content: flex-end; max-width: 280px; z-index: 3; pointer-events: auto;
}
.museum-btn {
  appearance: none; cursor: pointer; min-height: 32px; min-width: 40px; padding: 0 10px;
  border-radius: 9px; border: 1px solid rgba(255,255,255,.18);
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px); color: #eef1f4;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 10px;
  letter-spacing: 0.08em; text-transform: uppercase; touch-action: none; user-select: none;
}
.museum-btn-guide { border-color: #ffb347; color: #ffb347; }
.museum-nav { position: relative; }
.museum-nav-menu {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 4;
  margin: 0; padding: 6px; list-style: none;
  min-width: 148px; max-height: min(60vh, 420px); overflow-y: auto;
  background: rgba(14,16,19,.92); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.14); border-radius: 10px;
  display: flex; flex-direction: column; gap: 2px;
}
.museum-nav-item {
  appearance: none; cursor: pointer; display: block; width: 100%; text-align: left;
  min-height: 30px; padding: 0 10px; border: 0; border-radius: 6px;
  background: transparent; color: #eef1f4;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.museum-nav-item:hover { background: rgba(255,255,255,.08); }
.museum-nav-item-here { color: #ffb347; }
.museum-minimap {
  position: absolute; right: 14px; top: 14px; width: 272px; z-index: 3;
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 8px;
  pointer-events: auto;
}
.museum-minimap .floor-map { max-width: none; }
.museum-help {
  position: absolute; left: 14px; bottom: 14px; z-index: 2; pointer-events: none;
  padding: 7px 11px; font-size: 11px; line-height: 1.6; color: #c3c9d0;
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.12); border-radius: 10px;
}
@media (max-width: 720px) {
  .museum-minimap { width: 180px; }
  .museum-help { display: none; }
}
`
