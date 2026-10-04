'use client'

import { building, exhibits, standpoints, isExhibitId } from '../../lib/museum-data'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const Museum = dynamic(() => import('@museum/scene').then((m) => m.Museum), {
  ssr: false,
  loading: () => <div className="visit-loading">Loading museum…</div>
})

function VisitMuseum() {
  const params = useSearchParams()
  const raw = params.get('exhibit')
  const initialExhibit = raw && isExhibitId(raw) ? raw : null
  return (
    <Museum
      building={building}
      exhibits={exhibits}
      standpoints={standpoints}
      initialExhibit={initialExhibit}
    />
  )
}

export default function VisitPage() {
  return (
    <main className="visit-page">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />
      <header className="visit-header">
        <Link href="/" className="visit-brand">
          Hello Museum
        </Link>
        <nav aria-label="Museum">
          <Link href="/map">Floor plan</Link>
          <Link href="/exhibits">Exhibits</Link>
        </nav>
      </header>
      <Suspense fallback={<div className="visit-loading">Loading museum…</div>}>
        <VisitMuseum />
      </Suspense>
      <style>{`
        .visit-page { min-height: 100vh; background: #1d2024; color: #eef1f4; }
        .visit-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 12px 16px;
          font-family: "Chakra Petch", sans-serif;
        }
        .visit-brand { font-weight: 700; color: #ffb347; text-decoration: none; letter-spacing: 0.04em; }
        .visit-header nav { display: flex; gap: 14px; }
        .visit-header a { color: #c3c9d0; text-decoration: none; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
        .visit-header a:hover { color: #ffb347; }
        .visit-loading {
          display: grid; place-items: center; min-height: 520px;
          font-family: "Chakra Petch", sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #5b6168;
        }
      `}</style>
    </main>
  )
}
