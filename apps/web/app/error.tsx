'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main" className="container">
      <section className="status-page" role="alert">
        <div className="status-card">
          <p className="kicker">Something went wrong</p>
          <h1>This exhibit hit a snag</h1>
          <p>The page failed to load. Try again, or head back to the floor plan.</p>
          <div className="status-actions">
            <button type="button" className="btn btn--primary" onClick={() => retry()}>
              Try again
            </button>
            <Link href="/map" className="btn">
              Floor plan
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
