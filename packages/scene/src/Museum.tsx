'use client'

import type { Building } from '@museum/content/plan-schema'
import type { Tour } from '@museum/content/tour-schema'
import type { Exhibit, ExhibitId } from '@museum/content/schema'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { registerExhibitAudio } from './audio/narratorBus'
import { Atrium } from './building/Atrium'
import { Floors } from './building/Floors'
import { benchObstacles, galleryBenchSpots } from './building/furniture'
import { Signage } from './building/Signage'
import { Walls } from './building/Walls'
import { Exhibits } from './exhibits/Exhibits'
import { requestOpen } from './exhibits/open'
import { SpotPool } from './exhibits/SpotPool'
import { useExhibitUi } from './exhibits/ui'
import { GuidePanel } from './guide/GuidePanel'
import { useGuideStore } from './guide/state'
import { Hud } from './hud/Hud'
import { LoadingScreen, Welcome } from './hud/Loading'
import { Lighting } from './lighting/Lighting'
import { PostFx } from './lighting/PostFx'
import { bindMuseumApi, setMapBuilding } from './nav/api'
import { setStandpoints, type StandpointsData } from './nav/targets'
import { TravelDriver } from './nav/travel'
import { disposeNav, loadNavMesh } from './nav/useNav'
import { usePassport } from './passport'
import { PortalOverlay } from './portal/PortalOverlay'
import { buildCollisionSegments } from './player/collision'
import { Controls } from './player/Controls'
import { usePlayer } from './player/usePlayer'
import { detectQuality, settingsFor, type QualityTier } from './quality'
import { TourBar } from './tour/TourBar'
import { TourDriver } from './tour/TourDriver'
import { useTourStore } from './tour/store'

export interface MuseumProps {
  building: Building
  exhibits: readonly Exhibit[]
  standpoints: StandpointsData
  /** URL for the committed navmesh binary (default `/navmesh.bin`). */
  navmeshUrl?: string
  /** Deep link: walk to this exhibit and open its portal once the navmesh is ready. */
  initialExhibit?: ExhibitId | null
  /** Guided tour content; enables the Take the tour button and the tour bar. */
  tour?: Tour | null
  /** Offer to start the tour once the scene is ready (from ?tour=demo). */
  startTour?: boolean
}

const WELCOME_KEY = 'museum.welcome.v1'

function SceneReady() {
  const setReady = usePlayer((s) => s.setReady)
  useEffect(() => {
    setReady(true)
    return () => setReady(false)
  }, [setReady])
  return null
}

/**
 * Publishes the previous frame's total draw calls. `info.autoReset` is off so
 * shadow and post-processing passes are counted together; this probe runs
 * first in each frame (priority below zero), reads the total, then resets.
 */
function DrawCallProbe() {
  const { gl } = useThree()
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    ;(window as unknown as { __scene: unknown }).__scene = scene
  }, [scene])
  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])
  useFrame(() => {
    const calls = gl.info.render.calls
    gl.info.reset()
    const el = document.querySelector('.museum-view')
    if (!el) return
    const player = usePlayer.getState()
    const ui = useExhibitUi.getState()
    el.setAttribute('data-draw-calls', String(calls))
    el.setAttribute('data-player-x', player.x.toFixed(2))
    el.setAttribute('data-player-z', player.z.toFixed(2))
    el.setAttribute('data-focus', ui.focusId ?? '')
    el.setAttribute('data-hover', ui.hoverId ?? '')
    el.setAttribute('data-open', usePassport.getState().openId ?? '')
  }, -1000)
  return null
}

function SceneBody({
  building,
  exhibits,
  standpoints,
  quality,
  container
}: {
  building: Building
  exhibits: readonly Exhibit[]
  standpoints: StandpointsData
  quality: QualityTier
  container: HTMLElement | null
}) {
  const walls = useMemo(() => buildCollisionSegments(building), [building])
  const benches = useMemo(
    () =>
      galleryBenchSpots({
        building,
        exhibits,
        stops: [...Object.values(standpoints.exhibits), ...Object.values(standpoints.rooms)]
      }),
    [building, exhibits, standpoints]
  )
  const obstacles = useMemo(() => benchObstacles(benches), [benches])
  return (
    <>
      <Lighting quality={quality} />
      <Floors building={building} />
      <Walls building={building} />
      <Atrium building={building} benches={benches} />
      <Signage building={building} />
      <Exhibits building={building} exhibits={exhibits} />
      <SpotPool exhibits={exhibits} walls={walls} />
      <TravelDriver />
      <Controls building={building} exhibits={exhibits} container={container} obstacles={obstacles} />
      <PostFx quality={quality} />
      <DrawCallProbe />
      <SceneReady />
    </>
  )
}

function qualityFromQuery(): QualityTier | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('quality')
  if (value === 'high' || value === 'balanced' || value === 'low') return value
  return null
}

function welcomeSeen(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Shows the welcome splash once per session after the scene is ready, and
 * hides it at the first sign the visitor has started: moving, opening a
 * portal or the guide, a key press or a click in the scene.
 */
function useWelcome(ready: boolean, skip: boolean, container: HTMLElement | null) {
  const [state, setState] = useState<'pending' | 'show' | 'done'>('pending')

  const dismiss = useCallback(() => {
    setState('done')
    try {
      sessionStorage.setItem(WELCOME_KEY, '1')
    } catch {
      // Private mode: the splash simply shows again next visit.
    }
  }, [])

  useEffect(() => {
    if (!ready || state !== 'pending') return
    setState(skip || welcomeSeen() ? 'done' : 'show')
  }, [ready, skip, state])

  useEffect(() => {
    if (state !== 'show') return
    const start = usePlayer.getState()
    const offPlayer = usePlayer.subscribe((s) => {
      if (Math.hypot(s.x - start.x, s.z - start.z) > 0.3) dismiss()
    })
    const offGuide = useGuideStore.subscribe((s) => {
      if (s.open) dismiss()
    })
    const offPassport = usePassport.subscribe((s) => {
      if (s.openId) dismiss()
    })
    const inSplash = (target: EventTarget | null) =>
      target instanceof Element && target.closest('.museum-welcome') !== null
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Shift' || inSplash(event.target)) return
      dismiss()
    }
    const onPointer = (event: PointerEvent) => {
      if (!inSplash(event.target)) dismiss()
    }
    container?.addEventListener('keydown', onKey)
    container?.addEventListener('pointerdown', onPointer)
    return () => {
      offPlayer()
      offGuide()
      offPassport()
      container?.removeEventListener('keydown', onKey)
      container?.removeEventListener('pointerdown', onPointer)
    }
  }, [state, container, dismiss])

  return { show: state === 'show', dismiss }
}

export function Museum({
  building,
  exhibits,
  standpoints,
  navmeshUrl = '/navmesh.bin',
  initialExhibit = null,
  tour = null,
  startTour = false
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
  const tourPhase = useTourStore((s) => s.state.phase)
  const welcome = useWelcome(sceneReady, initialExhibit !== null || startTour, container)

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
          camera={{ fov: 62, near: 0.05, far: 260, position: [0, 1.65, 20.7] }}
          gl={{ antialias: !settings.post, stencil: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <SceneBody
              building={building}
              exhibits={exhibits}
              standpoints={standpoints}
              quality={settings.tier}
              container={container}
            />
          </Suspense>
        </Canvas>
      ) : null}
      <Hud building={building} exhibits={exhibits} />
      {welcome.show ? (
        <Welcome
          onEnter={() => {
            welcome.dismiss()
            container?.focus({ preventScroll: true })
          }}
        />
      ) : null}
      <PortalOverlay exhibits={exhibits} returnFocus={container} />
      <GuidePanel exhibits={exhibits} />
      {tour ? <TourDriver tour={tour} /> : null}
      {tour ? <TourBar exhibits={exhibits} /> : null}
      {tour && startTour && sceneReady && tourPhase === 'idle' ? (
        <div className="tour-start" role="dialog" aria-label="Start the tour">
          <button
            type="button"
            className="btn btn--primary"
            data-testid="tour-start"
            onClick={() => {
              welcome.dismiss()
              useTourStore.getState().dispatch({ type: 'START' })
            }}
          >
            Start the tour
          </button>
        </div>
      ) : null}
      <LoadingScreen stages={{ quality: quality !== null, nav: navReady, scene: ready }} />
    </div>
  )
}
