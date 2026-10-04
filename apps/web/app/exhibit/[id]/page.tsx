import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EXHIBIT_IDS, type ExhibitId } from '@museum/content/schema'
import { FloorMap } from '@museum/scene'
import { SiteNav } from '../../../components/SiteNav'
import {
  bandLabel,
  exhibitDescription,
  isPlannedExhibit,
  plannedExhibitNote,
  tierLabel,
  zoneLabel
} from '../../../lib/exhibit-copy'
import {
  building,
  exhibits,
  exhibitsByZone,
  getExhibit,
  isExhibitId
} from '../../../lib/museum-data'
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
    return { title: 'Exhibit | The NeXT-Gen Museum' }
  }
  const exhibit = getExhibit(id)
  if (!exhibit) {
    return { title: 'Exhibit | The NeXT-Gen Museum' }
  }
  return {
    title: `${exhibit.id} ${exhibit.title} | The NeXT-Gen Museum`,
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

  return (
    <div className={styles.shell}>
      <SiteNav />
      <main className={styles.main}>
        <article className={styles.article}>
          <header>
            <h1>
              {exhibit.id}. {exhibit.title}
            </h1>
            <ul className={styles.meta}>
              <li>Year: {exhibit.year}</li>
              <li>Zone: {zoneLabel(exhibit.zone)}</li>
              <li>Band: {bandLabel(exhibit.band)}</li>
              <li>Tier: {tierLabel(exhibit.tier)}</li>
            </ul>
          </header>

          {planned ? <p className={styles.planned}>{plannedExhibitNote(exhibit)}</p> : null}

          {exhibit.caption ? <p className={styles.caption}>{exhibit.caption}</p> : null}

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

          <div className={styles.actions}>
            <Link className={styles.cta} href={`/visit?exhibit=${exhibit.id}`}>
              Open in museum
            </Link>
            <Link className={styles.link} href="/map">
              View on floor plan
            </Link>
            <Link className={styles.link} href="/exhibits">
              All exhibits
            </Link>
          </div>

          {exhibit.sources && exhibit.sources.length > 0 ? (
            <section className={styles.section}>
              <h2>Sources</h2>
              <ul className={styles.sources}>
                {exhibit.sources.map((source) => (
                  <li key={source.id}>
                    {source.url.startsWith('[TBD') ? (
                      <span>
                        {source.label} ({source.id})
                      </span>
                    ) : (
                      <a href={source.url} rel="noopener noreferrer">
                        {source.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {exhibit.caveat ? (
            <section className={styles.section}>
              <h2>Caveat</h2>
              <p className={styles.caveat}>{exhibit.caveat}</p>
            </section>
          ) : null}

          <section className={styles.section}>
            <h2>On the map</h2>
            <div className={styles.miniMap}>
              <FloorMap
                building={building}
                exhibits={exhibits}
                highlight={[exhibit.id]}
                compact
              />
            </div>
          </section>

          <nav className={styles.pager} aria-label="Nearby exhibits in this zone">
            <div>
              {prev && prevExhibit ? (
                <Link className={styles.link} href={`/exhibit/${prev}`}>
                  Previous: {prev} {prevExhibit.title}
                </Link>
              ) : (
                <span>Previous: none</span>
              )}
            </div>
            <div>
              {next && nextExhibit ? (
                <Link className={styles.link} href={`/exhibit/${next}`}>
                  Next: {next} {nextExhibit.title}
                </Link>
              ) : (
                <span>Next: none</span>
              )}
            </div>
          </nav>
        </article>
      </main>
    </div>
  )
}
