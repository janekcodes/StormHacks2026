import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'

export const metadata: Metadata = {
  title: 'Not found | Hello Museum'
}

export default function NotFound() {
  return (
    <div className="site">
      <SiteHeader />
      <main id="main" className="site-main container">
        <section className="status-page">
          <div className="status-card">
            <p className="status-code" aria-hidden="true">
              404
            </p>
            <p className="kicker">Gallery closed</p>
            <h1>This room is not on the floor plan</h1>
            <p>The page you asked for does not exist. The collection is a short walk away.</p>
            <div className="status-actions">
              <Link href="/visit" className="btn btn--primary">
                Enter the museum
              </Link>
              <Link href="/map" className="btn">
                Floor plan
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
