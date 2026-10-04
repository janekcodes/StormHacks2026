'use client'

import type { Building } from '@museum/content/plan-schema'
import type { Exhibit, ExhibitId } from '@museum/content/schema'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { Atrium } from './building/Atrium'
import { Floors } from './building/Floors'
import { Signage } from './building/Signage'
import { Walls } from './building/Walls'
import { Lighting } from './lighting/Lighting'
import { FloorMap } from './map/FloorMap'
import { bindMuseumApi, museum, setMapBuilding } from './nav/api'
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
    if (el) el.setAttribute('data-draw-calls', String(gl.info.render.calls))
  })
  return null
}

function SceneBody({
  building,
  quality,
  container
}: {
  building: Building
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
      <TravelDriver />
      <Controls building={building} container={container} />
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

  const kicker =
    zoneKey === 'Atr' ||
    zoneKey === 'Conc' ||
    zoneKey === 'Foyer' ||
    zoneKey === 'Shop' ||
    zoneKey === 'Outside'
      ? 'Public area'
      : 'Gallery'

  return (
    <>
      <div className="museum-hud museum-zone" data-testid="zone-hud">
        <div className="museum-kicker">{kicker}</div>
        <div className="museum-zone-name">{zoneName}</div>
        <div className="museum-meta">
          {ready ? 'ready' : 'loading'} · {quality}
        </div>
      </div>
      <div className="museum-crosshair" aria-hidden="true" />
      <TouchControls />
      <div className="museum-jumps" data-testid="room-jumps" role="navigation" aria-label="Jump to room">
        {ROOM_JUMP_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={key === zoneKey ? 'museum-btn museum-btn-here' : 'museum-btn'}
            aria-label={`Go to ${roomJumpLabel(key)}`}
            onClick={() => museum.goRoom(key)}
          >
            {roomJumpLabel(key)}
          </button>
        ))}
      </div>
      {showMap ? (
        <div className="museum-minimap" data-testid="minimap">
          <FloorMap
            building={building}
            exhibits={exhibits}
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
        W A S D / arrows move · Q or left/right turn · Shift run · Drag look · M map · click map to walk
      </div>
    </>
  )
}

export function Museum({
  building,
  exhibits,
  standpoints,
  navmeshUrl = '/navmesh.bin'
}: MuseumProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [quality, setQuality] = useState<QualityTier | null>(null)
  const [navReady, setNavReady] = useState(false)
  const setStoreQuality = usePlayer((s) => s.setQuality)
  const ready = usePlayer((s) => s.ready)

  useEffect(() => {
    setStandpoints(standpoints)
  }, [standpoints])

  useEffect(() => {
    setMapBuilding(building)
    bindMuseumApi(true)
    return () => {
      setMapBuilding(null)
      bindMuseumApi(false)
    }
  }, [building])

  useEffect(() => {
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
      aria-label="3D museum building. W A S D or arrow keys to move and turn, drag to look, M toggles the map."
      data-ready={sceneReady ? 'true' : 'false'}
      data-nav={navReady ? 'true' : 'false'}
    >
      {settings ? (
        <Canvas
          shadows={settings.shadows}
          dpr={settings.dpr}
          camera={{ fov: 62, near: 0.05, far: 260, position: [0, 1.65, 34.5] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <SceneBody building={building} quality={settings.tier} container={container} />
          </Suspense>
        </Canvas>
      ) : (
        <div className="museum-loading">Detecting GPU…</div>
      )}
      <Hud building={building} exhibits={exhibits} />
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
.museum-loading {
  display: grid; place-items: center; height: 100%;
  color: #5b6168; font-family: "Chakra Petch", sans-serif; letter-spacing: 0.08em; text-transform: uppercase;
}
.museum-hud {
  position: absolute; pointer-events: none; z-index: 2;
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.12); border-radius: 10px; color: #eef1f4;
}
.museum-zone { left: 14px; top: 14px; padding: 8px 12px; max-width: 360px; }
.museum-kicker {
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: #ffb347;
}
.museum-zone-name {
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 18px; margin-top: 2px;
}
.museum-meta { font-size: 11px; color: #aab2bb; margin-top: 4px; }
.museum-crosshair {
  position: absolute; left: 50%; top: 50%; width: 6px; height: 6px;
  margin: -3px 0 0 -3px; border-radius: 50%;
  background: rgba(255,255,255,.85); box-shadow: 0 0 0 1px rgba(0,0,0,.4); z-index: 2; pointer-events: none;
}
.museum-touch {
  position: absolute; right: 14px; bottom: 14px; display: flex; gap: 6px; flex-wrap: wrap;
  justify-content: flex-end; max-width: 280px; z-index: 3; pointer-events: auto;
}
.museum-jumps {
  position: absolute; left: 14px; top: 88px; display: flex; flex-wrap: wrap; gap: 5px;
  max-width: 320px; z-index: 3; pointer-events: auto;
}
.museum-btn {
  appearance: none; cursor: pointer; min-height: 32px; min-width: 40px; padding: 0 10px;
  border-radius: 9px; border: 1px solid rgba(255,255,255,.18);
  background: rgba(14,16,19,.74); backdrop-filter: blur(8px); color: #eef1f4;
  font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 10px;
  letter-spacing: 0.08em; text-transform: uppercase; touch-action: none; user-select: none;
}
.museum-btn-here { border-color: #ffb347; color: #ffb347; }
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
  .museum-jumps { max-width: 200px; }
}
`
