'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { SiteHeader } from '../../components/SiteHeader'
import { building, exhibits, standpoints, tour, isExhibitId } from '../../lib/museum-data'

function VisitLoading() {
  return (
    <div className="museum-loading" role="status">
      <div className="museum-loading-card">
        <span className="museum-loading-mark" aria-hidden="true">
          HM
        </span>
        <p className="museum-loading-title">Hello Museum</p>
        <p className="museum-loading-stage">Opening the doors</p>
      </div>
    </div>
  )
}

const Museum = dynamic(() => import('@museum/scene').then((m) => m.Museum), {
  ssr: false,
  loading: VisitLoading
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
      tour={tour}
      startTour={params.get('tour') === tour.id}
    />
  )
}

export default function VisitPage() {
  return (
    <div className="visit-shell theme-night">
      <SiteHeader night mainId="museum" />
      <main id="museum" className="visit-stage" tabIndex={-1}>
        <h1 className="visually-hidden">Visit Hello Museum</h1>
        <Suspense fallback={<VisitLoading />}>
          <VisitMuseum />
        </Suspense>
      </main>
    </div>
  )
}
