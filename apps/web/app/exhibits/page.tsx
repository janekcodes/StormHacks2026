import type { Metadata } from 'next'
import Link from 'next/link'
import { BANDS, type Band, type Exhibit } from '@museum/content/schema'
import { ZONES } from '@museum/content/zones'
import { SiteNav } from '../../components/SiteNav'
import { bandLabel, tierLabel } from '../../lib/exhibit-copy'
import { exhibits } from '../../lib/museum-data'
import styles from '../museum.module.css'

export const metadata: Metadata = {
  title: 'Exhibits | The NeXT-Gen Museum',
  description: 'Every exhibit in the NeXT-Gen Museum, grouped by zone and band.'
}

const BAND_ORDER: Array<Band | 'none'> = [...BANDS, 'none']

function bandKey(band: Band | null): Band | 'none' {
  return band ?? 'none'
}

function groupByBand(zoneExhibits: Exhibit[]): Array<{ band: Band | 'none'; items: Exhibit[] }> {
  const buckets = new Map<Band | 'none', Exhibit[]>()
  for (const key of BAND_ORDER) buckets.set(key, [])
  for (const exhibit of zoneExhibits) {
    const key = bandKey(exhibit.band)
    buckets.get(key)?.push(exhibit)
  }
  return BAND_ORDER.map((band) => ({
    band,
    items: (buckets.get(band) ?? []).sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    )
  })).filter((group) => group.items.length > 0)
}

export default function ExhibitsPage() {
  return (
    <div className={styles.shell}>
      <SiteNav />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Exhibits</h1>
          <p className={styles.lede}>
            Browse the collection by zone and band. Built exhibits are on display; Core, Extended and
            Open entries are planned.
          </p>
        </header>

        {ZONES.map((zone) => {
          const zoneExhibits = exhibits.filter((exhibit) => exhibit.zone === zone.code)
          if (zoneExhibits.length === 0) return null
          const groups = groupByBand(zoneExhibits)
          return (
            <section key={zone.code} className={styles.zoneBlock} aria-labelledby={`zone-${zone.code}`}>
              <h2 id={`zone-${zone.code}`}>
                {zone.code}. {zone.name}
              </h2>
              <p className={styles.zoneMeta}>{zone.location}</p>
              {groups.map((group) => (
                <div key={group.band} className={styles.bandBlock}>
                  <h3>{bandLabel(group.band === 'none' ? null : group.band)}</h3>
                  <ul className={styles.list}>
                    {group.items.map((exhibit) => (
                      <li key={exhibit.id}>
                        <Link href={`/exhibit/${exhibit.id}`}>
                          <span className={styles.id}>{exhibit.id}</span>
                          <span className={styles.year}>{exhibit.year}</span>
                          <span>{exhibit.title}</span>
                          <span className={styles.tier}>{tierLabel(exhibit.tier)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )
        })}
      </main>
    </div>
  )
}
