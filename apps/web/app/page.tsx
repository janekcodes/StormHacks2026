import type { Metadata } from 'next'
import Link from 'next/link'
import { FloorMap } from '@museum/scene/map'
import { SiteNav } from '../components/SiteNav'
import { zoneLabel } from '../lib/exhibit-copy'
import { building, exhibits } from '../lib/museum-data'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Hello Museum',
  description: 'A virtual museum showcasing major milestones in the history of Computer Science.'
}

export default function Page() {
  const built = exhibits
    .filter((exhibit) => exhibit.tier === 'built')
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

  return (
    <div className={styles.shell}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;600&display=swap"
      />
      <SiteNav />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Hello Museum</h1>
          <p className={styles.tagline}>
            A virtual museum showcasing major milestones in the history of Computer Science
          </p>
          <p className={styles.lede}>
            Walk a 3D museum of computer science. Step up to an exhibit and open its portal to do the
            thing the milestone was about.
          </p>
          <div className={styles.ctas}>
            <Link href="/visit" className={styles.cta}>
              Enter the museum
            </Link>
            <Link href="/map" className={styles.ctaSecondary}>
              View floor plan
            </Link>
            <Link href="/exhibits" className={styles.ctaSecondary}>
              Browse exhibits
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Explore the museum</h2>
            <p className={styles.sectionMeta}>
              {exhibits.length} exhibit positions across the atrium, six wings and three galleries.{' '}
              {built.length} are built and open.
            </p>
          </div>
          <div className={styles.mapWrap}>
            <FloorMap building={building} exhibits={exhibits} compact />
          </div>
          <p className={styles.mapCaption}>
            Click a marker to open its exhibit page, or view the full{' '}
            <Link href="/map" className={styles.link}>
              floor plan
            </Link>
            .
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>On display now</h2>
            <p className={styles.sectionMeta}>Thirteen exhibits with working portals.</p>
          </div>
          <ul className={styles.cards}>
            {built.map((exhibit) => (
              <li key={exhibit.id} className={styles.card}>
                <span className={styles.cardId}>{exhibit.id}</span>
                <span className={styles.cardYear}>{exhibit.year}</span>
                <span className={styles.cardTitle}>{exhibit.title}</span>
                <span className={styles.cardZone}>{zoneLabel(exhibit.zone)}</span>
                <span className={styles.cardLinks}>
                  <Link href={`/exhibit/${exhibit.id}`} className={styles.link}>
                    Exhibit page
                  </Link>
                  <Link href={`/visit?exhibit=${exhibit.id}`} className={styles.link}>
                    Open in museum
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
