'use client'

import { useState, type ReactElement } from 'react'
import { loadCopy } from './copy'
import { toggleMode, webStats, type WebMode } from './logic'

export interface PortalProps {
  onClose?: () => void
}

const copy = loadCopy('D7')

export const Portal: (props: PortalProps) => ReactElement = function Portal() {
  const [mode, setMode] = useState<WebMode>('2026')
  const stats = webStats(mode)
  const vintage = mode === '1991'

  return (
    <section className="era" data-testid="portal-package" data-portal-id="D7" aria-label={copy.title}>
      <div className="row">
        <div className="stats">
          <span>
            Weight <b>{stats.weight}</b>
          </span>
          <span>
            Requests <b>{stats.requests}</b>
          </span>
          <span>
            JS <b>{stats.js}</b>
          </span>
          <span>
            CSS <b>{stats.css}</b>
          </span>
        </div>
        <button type="button" className={vintage ? 'btn on' : 'btn'} aria-pressed={vintage} onClick={() => setMode((current) => toggleMode(current))}>
          {vintage ? 'Restore 2026 mode' : 'Toggle 1991 web mode'}
        </button>
      </div>
      <div className="browser">
        <div className="chrome">
          <span className="app">{stats.app}</span>
          <span className="url">{stats.url}</span>
        </div>
        {vintage ? <Page1991 /> : <Page2026 />}
      </div>
      <pre>{stats.http}</pre>
      <style>{css}</style>
    </section>
  )
}

function Page2026() {
  return (
    <div className="modern">
      <div className="top">
        <b>Open Encyclopedia</b>
        <span className="pill">Sign in</span>
      </div>
      <div className="body">
        <div>
          <div className="hero">[hero image · 1.1 MB]</div>
          <h3>World Wide Web</h3>
          <p>
            A system of interlinked hypertext documents on the Internet, proposed by Tim Berners-Lee at CERN in 1989 and made public in 1991.
          </p>
        </div>
        <aside>
          <p>
            <b>Quick facts</b>
            <br />
            Launched: 1991
            <br />
            Protocol: HTTP
          </p>
          <div className="ad">[ad slot · 4 trackers]</div>
        </aside>
      </div>
      <div className="cookies">We use cookies to personalise content. Accept all</div>
    </div>
  )
}

function Page1991() {
  return (
    <div className="raw">
      <h3>World Wide Web</h3>
      <p>
        A system of interlinked hypertext documents on the Internet, proposed by Tim Berners-Lee at CERN in 1989 and made public in 1991.
      </p>
      <h4>Quick facts</h4>
      <ul>
        <li>Launched: 1991</li>
        <li>Protocol: HTTP</li>
      </ul>
    </div>
  )
}

const css = `
.era { --ink: #E4EAF0; --bg: #08090a; --muted: #d5dde4; --line: #2a2e33; box-sizing: border-box; width: 100%; padding: 8px 0 4px; background: var(--bg); color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; display: flex; flex-direction: column; gap: 14px; }
.era .row, .era .stats { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
.era .stats { font-size: 12px; justify-content: flex-start; }
.era .btn { appearance: none; cursor: pointer; min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font-family: "Chakra Petch", sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
.era .btn.on { background: var(--ink); color: #111; }
.era .btn:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
.era .browser { border-radius: 8px; overflow: hidden; border: 1px solid #4a5058; }
.era .chrome { display: flex; align-items: center; gap: 10px; padding: 7px 12px; background: #2b2f34; font-size: 12px; }
.era .app { font-family: "Chakra Petch", sans-serif; font-weight: 700; }
.era .url { flex: 1; min-width: 0; background: #16191c; border: 1px solid #3a4048; border-radius: 4px; padding: 3px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.era .modern { background: #f6f7f9; color: #1d2330; font-family: "Chakra Petch", sans-serif; font-size: 14px; }
.era .top { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #e1e4ea; }
.era .pill { background: #2453c7; color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 12px; }
.era .body { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; }
.era .body > div { flex: 999 1 300px; }
.era aside { flex: 1 1 180px; }
.era .hero, .era .ad { display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 12px; }
.era .hero { height: 100px; background: #dfe3ea; border: 1px dashed #9aa3b2; color: #4e5868; }
.era .ad { height: 70px; background: #fff4d6; border: 1px dashed #c9a43c; color: #6b5310; margin-top: 10px; }
.era h3 { margin: 10px 0; font-size: 26px; line-height: 1.1; }
.era .modern p, .era .raw p { margin: 0; line-height: 1.55; }
.era aside p { background: #fff; border: 1px solid #e1e4ea; border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.6; }
.era .cookies { padding: 10px 16px; background: #1d2330; color: #e6e9ef; font-size: 12px; }
.era .raw { padding: 4px 18px 16px; background: #fff; color: #000; font-family: "Times New Roman", Times, serif; font-size: 16px; }
.era .raw h3 { font-size: 2em; }
.era .raw h4 { font-size: 1.2em; margin: 0.7em 0 0.3em; }
.era pre { margin: 0; padding: 12px; background: #000; border: 1px solid var(--line); border-radius: 6px; font-size: 12.5px; line-height: 1.5; color: var(--ink); white-space: pre-wrap; }
@media (prefers-reduced-motion: reduce) { .era * { animation: none !important; } }
`
