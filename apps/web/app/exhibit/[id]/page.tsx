import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { EXHIBIT_IDS, type ExhibitId } from '@museum/content/schema'
import { zoneByCode } from '@museum/content/zones'
import { FloorMap } from '@museum/scene/map'
import { ExhibitPortal } from '../../../components/ExhibitPortal'
import { GuideWidget } from '../../../components/GuideWidget'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'
import {
  bandLabel,
  exhibitDescription,
  isPlannedExhibit,
  plannedExhibitNote,
  tierLabel,
  zoneLabel
} from '../../../lib/exhibit-copy'
import { building, exhibits, exhibitsByZone, getExhibit, isExhibitId } from '../../../lib/museum-data'
import styles from '../../museum.module.css'

type PageProps = {
  params: Promise<{ id: string }>
}

export function generateStaticParams() {
  return EXHIBIT_IDS.map((id) => ({ id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  if (!isExhibitId(id)) {
    return { title: 'Exhibit | Hello Museum' }
  }
  const exhibit = getExhibit(id)
  if (!exhibit) {
    return { title: 'Exhibit | Hello Museum' }
  }
  return {
    title: `${exhibit.id} ${exhibit.title} | Hello Museum`,
    description: exhibitDescription(exhibit)
  }
}

function neighbours(id: ExhibitId): { prev?: ExhibitId; next?: ExhibitId } {
  const zoneList = exhibitsByZone(getExhibit(id)?.zone ?? '')
    .map((exhibit) => exhibit.id)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const index = zoneList.indexOf(id)
  if (index < 0) return {}
  const prev = index > 0 ? zoneList[index - 1] : undefined
  const next = index < zoneList.length - 1 ? zoneList[index + 1] : undefined
  return {
    ...(prev ? { prev } : {}),
    ...(next ? { next } : {})
  }
}

export default async function ExhibitPage({ params }: PageProps) {
  const { id } = await params
  if (!isExhibitId(id)) notFound()
  const exhibit = getExhibit(id)
  if (!exhibit) notFound()

  const planned = isPlannedExhibit(exhibit)
  const { prev, next } = neighbours(id)
  const prevExhibit = prev ? getExhibit(prev) : undefined
  const nextExhibit = next ? getExhibit(next) : undefined
  const ink = zoneByCode(exhibit.zone)?.ink
  const band = bandLabel(exhibit.band)

  return (
    <div className="site">
      <SiteHeader />
      <main
        id="main"
        className={`site-main container ${styles.main}`}
        style={ink ? ({ '--zone-ink': ink } as CSSProperties) : undefined}
      >
        <article className={styles.article}>
          <header className={styles.exhibitHead}>
            <p className={styles.exhibitKicker}>
              <span className={styles.zoneCode}>{exhibit.zone}</span>
              {zoneLabel(exhibit.zone)}
            </p>
            <h1>
              <span className={styles.exhibitId}>{exhibit.id}</span> {exhibit.title}
            </h1>
            <dl className={styles.meta}>
              <div>
                <dt>Year</dt>
                <dd>{exhibit.year}</dd>
              </div>
              {band ? (
                <div>
                  <dt>Era</dt>
                  <dd>{band}</dd>
                </div>
              ) : null}
              <div>
                <dt>Status</dt>
                <dd>
                  <span className="badge" data-tier={exhibit.tier}>
                    {tierLabel(exhibit.tier)}
                  </span>
                </dd>
              </div>
            </dl>
          </header>

          {planned ? <p className={styles.planned}>{plannedExhibitNote(exhibit)}</p> : null}

          {exhibit.caption ? <p className={styles.caption}>{exhibit.caption}</p> : null}

          <div className={styles.actions}>
            <Link className="btn btn--primary" href={`/visit?exhibit=${exhibit.id}`}>
              Open in museum
            </Link>
            <Link className="btn" href="/map">
              View on floor plan
            </Link>
          </div>

          {exhibit.tier === 'built' ? (
            <section className={styles.section} aria-labelledby="portal-heading">
              <h2 id="portal-heading" className={styles.sectionTitle}>
                Try it
              </h2>
              <div className={`theme-night ${styles.screen}`}>
                <div className={styles.screenBar} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span className={styles.screenLabel}>
                    {exhibit.id} portal
                  </span>
                </div>
                <div className={styles.screenBody}>
                  <ExhibitPortal id={exhibit.id} />
                </div>
              </div>
            </section>
          ) : null}

          {exhibit.stats && exhibit.stats.length > 0 ? (
            <ul className={styles.stats}>
              {exhibit.stats.map((stat) => (
                <li key={`${stat.k}-${stat.v}`}>
                  <span className={styles.statKey}>{stat.k}</span>
                  <span className={styles.statVal}>{stat.v}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={styles.columns}>
            <div>
              {exhibit.caveat ? (
                <section className={styles.section} aria-labelledby="caveat-heading">
                  <h2 id="caveat-heading" className={styles.sectionTitle}>
                    Caveat
                  </h2>
                  <p className={styles.caveat}>{exhibit.caveat}</p>
                </section>
              ) : null}

              {exhibit.sources && exhibit.sources.length > 0 ? (
                <section className={styles.section} aria-labelledby="sources-heading">
                  <h2 id="sources-heading" className={styles.sectionTitle}>
                    Sources
                  </h2>
                  <ol className={styles.sources}>
                    {exhibit.sources.map((source) => (
                      <li key={source.id}>
                        {source.url.startsWith('[TBD') ? (
                          <span>
                            {source.label} ({source.id})
                          </span>
                        ) : (
                          <a className="link" href={source.url} rel="noopener noreferrer">
                            {source.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>

            <section className={styles.section} aria-labelledby="map-heading">
              <h2 id="map-heading" className={styles.sectionTitle}>
                Where to find it
              </h2>
              <div className={`panel ${styles.miniMap}`}>
                <FloorMap building={building} exhibits={exhibits} highlight={[exhibit.id]} compact />
              </div>
            </section>
          </div>

          {prevExhibit || nextExhibit ? (
            <nav className={styles.pager} aria-label="Nearby exhibits in this gallery">
              {prev && prevExhibit ? (
                <Link className={styles.pagerLink} href={`/exhibit/${prev}`} rel="prev">
                  <span className="kicker">Previous</span>
                  <span>
                    {prev} {prevExhibit.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && nextExhibit ? (
                <Link className={`${styles.pagerLink} ${styles.pagerNext}`} href={`/exhibit/${next}`} rel="next">
                  <span className="kicker">Next</span>
                  <span>
                    {next} {nextExhibit.title}
                  </span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </article>
      </main>
      <SiteFooter />
      <GuideWidget exhibits={exhibits} currentExhibitId={exhibit.id} />
    </div>
  )
}
