import type { Metadata } from 'next'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ZONES, zoneByCode } from '@museum/content/zones'
import { FloorMap } from '@museum/scene/map'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { tierLabel, zoneLabel } from '../lib/exhibit-copy'
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
  // The Prologue (zone P) stands in the atrium; galleries are the wings around it.
  const galleries = ZONES.filter(
    (zone) => zone.code !== 'P' && exhibits.some((exhibit) => exhibit.zone === zone.code)
  ).length

  return (
    <div className="site">
      <SiteHeader />
      <main id="main" className="site-main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroMedia} aria-hidden="true" />
          <div className={`${styles.heroInner} container`}>
            <p className={`kicker ${styles.heroKicker}`}>A virtual museum of computer science</p>
            <h1 id="hero-title" className={styles.title}>
              Hello Museum
            </h1>
            <p className={styles.tagline}>
              A virtual museum showcasing major milestones in the history of Computer Science
            </p>
            <p className={styles.lede}>
              Walk the galleries in 3D. Step up to an exhibit and open its portal to do the thing the
              milestone was about.
            </p>
            <div className={styles.ctas}>
              <Link href="/visit" className="btn btn--accent btn--lg">
                Enter the museum
              </Link>
              <Link href="/map" className={`btn btn--lg ${styles.ghost}`}>
                Floor plan
              </Link>
              <Link href="/exhibits" className={`btn btn--lg ${styles.ghost}`}>
                Browse exhibits
              </Link>
            </div>
            <dl className={styles.stats}>
              <div>
                <dt>Exhibits</dt>
                <dd>{exhibits.length}</dd>
              </div>
              <div>
                <dt>Galleries</dt>
                <dd>{galleries}</dd>
              </div>
              <div>
                <dt>Working portals</dt>
                <dd>{built.length}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={`${styles.section} container`} aria-labelledby="on-display">
          <div className={styles.sectionHead}>
            <p className="kicker">On display now</p>
            <h2 id="on-display" className={styles.sectionTitle}>
              {built.length} exhibits with working portals
            </h2>
            <p className={styles.sectionMeta}>
              Each one opens an interactive portal you can try for yourself, in the museum or right here.
            </p>
          </div>
          <ul className={styles.cards}>
            {built.map((exhibit) => {
              const ink = zoneByCode(exhibit.zone)?.ink
              return (
                <li
                  key={exhibit.id}
                  className={styles.card}
                  style={ink ? ({ '--card-ink': ink } as CSSProperties) : undefined}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardId}>{exhibit.id}</span>
                    <span className={styles.cardYear}>{exhibit.year}</span>
                  </div>
                  <h3 className={styles.cardTitle}>
                    <Link href={`/exhibit/${exhibit.id}`} className={styles.cardLink}>
                      {exhibit.title}
                    </Link>
                  </h3>
                  {exhibit.hook || exhibit.caption ? (
                    <p className={styles.cardHook}>{exhibit.hook || exhibit.caption}</p>
                  ) : null}
                  <div className={styles.cardFoot}>
                    <span className={styles.cardZone}>{zoneLabel(exhibit.zone)}</span>
                    <Link href={`/visit?exhibit=${exhibit.id}`} className={styles.cardVisit}>
                      Open in museum
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={`${styles.section} ${styles.split} container`} aria-labelledby="explore">
          <div className={styles.sectionHead}>
            <p className="kicker">Explore the building</p>
            <h2 id="explore" className={styles.sectionTitle}>
              One atrium, {galleries} galleries
            </h2>
            <p className={styles.sectionMeta}>
              {exhibits.length} exhibit positions laid out from the Prologue in the atrium to the Future Lab.
              Solid markers are {tierLabel('built').toLowerCase()} and open now. Click any marker to read its
              exhibit page.
            </p>
            <Link href="/map" className="btn">
              Open the full floor plan
            </Link>
          </div>
          <div className={`panel ${styles.mapWrap}`}>
            <FloorMap building={building} exhibits={exhibits} compact />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
