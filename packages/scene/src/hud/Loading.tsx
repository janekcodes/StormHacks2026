'use client'

import { useEffect, useState } from 'react'
import { DefaultLoadingManager } from 'three'
import { usePresence } from '../ui'

/** Fraction of DefaultLoadingManager items loaded (models, textures, audio). */
function useAssetProgress(): number {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const manager = DefaultLoadingManager
    const prevProgress = manager.onProgress
    const prevLoad = manager.onLoad
    manager.onProgress = (url, loaded, total) => {
      prevProgress?.(url, loaded, total)
      setProgress(total > 0 ? loaded / total : 0)
    }
    manager.onLoad = () => {
      prevLoad?.()
      setProgress(1)
    }
    return () => {
      manager.onProgress = prevProgress
      manager.onLoad = prevLoad
    }
  }, [])
  return progress
}

export interface LoadingStages {
  quality: boolean
  nav: boolean
  scene: boolean
}

function stageLabel(stages: LoadingStages, assets: number): string {
  if (!stages.quality) return 'Checking your graphics'
  if (!stages.nav) return 'Laying out the galleries'
  if (!stages.scene || assets < 1) return 'Hanging the exhibits'
  return 'Lighting the rooms'
}

/** Branded loading screen with real progress; fades out once the scene is ready. */
export function LoadingScreen({ stages }: { stages: LoadingStages }) {
  const assets = useAssetProgress()
  const done = stages.quality && stages.nav && stages.scene
  const presence = usePresence(!done, 320)
  if (!presence) return null

  const progress = done
    ? 1
    : (stages.quality ? 0.15 : 0) + (stages.nav ? 0.25 : 0) + (stages.scene ? 0.2 : 0) + assets * 0.4
  const percent = Math.round(Math.min(1, progress) * 100)

  return (
    <div className="museum-loading" data-done={done ? 'true' : 'false'}>
      <div className="museum-loading-card">
        <span className="museum-loading-mark" aria-hidden="true">
          HM
        </span>
        <p className="museum-loading-title">Hello Museum</p>
        <div
          className="museum-progress"
          role="progressbar"
          aria-label="Loading the museum"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="museum-loading-stage" role="status">
          {done ? 'Welcome in' : stageLabel(stages, assets)}
        </p>
      </div>
    </div>
  )
}

const KEYS: ReadonlyArray<{ caps: readonly string[]; label: string }> = [
  { caps: ['W', 'A', 'S', 'D'], label: 'Walk' },
  { caps: ['←', '→'], label: 'Turn' },
  { caps: ['Shift'], label: 'Hurry' },
  { caps: ['Drag'], label: 'Look around' },
  { caps: ['E'], label: 'Open an exhibit' },
  { caps: ['M'], label: 'Floor plan' }
]

/** First-visit splash with the controls; dismissed by any interaction. */
export function Welcome({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="museum-welcome panel--glass" aria-labelledby="museum-welcome-title">
      <p className="kicker">Welcome</p>
      <h2 id="museum-welcome-title">Step into the galleries</h2>
      <p className="only-pointer">
        Walk up to any case and press E or click it to open its portal. The guide can walk you anywhere.
      </p>
      <p className="only-touch">
        Use the pad to walk, drag to look around and tap a case to open its portal. The guide can walk you
        anywhere.
      </p>
      <ul className="museum-keys only-pointer">
        {KEYS.map((key) => (
          <li key={key.label}>
            {key.caps.map((cap) => (
              <kbd key={cap} className="keycap">
                {cap}
              </kbd>
            ))}
            <span className="museum-keys-label">{key.label}</span>
          </li>
        ))}
      </ul>
      <div className="museum-welcome-actions">
        <button type="button" className="btn btn--accent" onClick={onEnter}>
          Start exploring
        </button>
        <p className="museum-welcome-hint only-pointer">Or just start walking.</p>
      </div>
    </section>
  )
}
