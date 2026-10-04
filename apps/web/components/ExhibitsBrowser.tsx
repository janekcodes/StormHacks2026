'use client'

import type { Exhibit, Tier } from '@museum/content/schema'
import type { Zone } from '@museum/content/zones'
import Link from 'next/link'
import { useMemo, useState, type CSSProperties } from 'react'
import { bandName, tierLabel } from '../lib/exhibit-copy'
import styles from '../app/museum.module.css'

const TIERS: readonly Tier[] = ['built', 'core', 'extended', 'open']

function byId(a: Exhibit, b: Exhibit): number {
  return a.id.localeCompare(b.id, undefined, { numeric: true })
}

export function ExhibitsBrowser({ exhibits, zones }: { exhibits: readonly Exhibit[]; zones: readonly Zone[] }) {
  const [zone, setZone] = useState<string>('all')
  const [tier, setTier] = useState<Tier | 'all'>('all')

  const visible = useMemo(
    () =>
      exhibits.filter(
        (exhibit) => (zone === 'all' || exhibit.zone === zone) && (tier === 'all' || exhibit.tier === tier)
      ),
    [exhibits, zone, tier]
  )
  const shownZones = zones.filter((z) => visible.some((exhibit) => exhibit.zone === z.code))
  const presentTiers = TIERS.filter((t) => exhibits.some((exhibit) => exhibit.tier === t))
  const presentZones = zones.filter((z) => exhibits.some((exhibit) => exhibit.zone === z.code))

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter exhibits">
        <label className={styles.field}>
          <span className="kicker">Gallery</span>
          <select value={zone} onChange={(event) => setZone(event.target.value)}>
            <option value="all">All galleries</option>
            {presentZones.map((z) => (
              <option key={z.code} value={z.code}>
                {z.code}. {z.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={styles.segmented}>
          <legend className="kicker">Status</legend>
          {(['all', ...presentTiers] as const).map((t) => (
            <label key={t} className={styles.segment}>
              <input
                type="radio"
                name="tier"
                value={t}
                checked={tier === t}
                onChange={() => setTier(t)}
              />
              <span>{t === 'all' ? 'All' : tierLabel(t)}</span>
            </label>
          ))}
        </fieldset>
        <p className={styles.count} role="status">
          Showing {visible.length} of {exhibits.length}
        </p>
      </div>

      {shownZones.length === 0 ? (
        <p className={styles.empty}>No exhibits match these filters.</p>
      ) : null}

      {shownZones.map((z) => {
        const items = visible.filter((exhibit) => exhibit.zone === z.code).sort(byId)
        return (
          <section
            key={z.code}
            className={styles.zoneBlock}
            aria-labelledby={`zone-${z.code}`}
            style={{ '--zone-ink': z.ink } as CSSProperties}
          >
            <div className={styles.zoneHead}>
              <h2 id={`zone-${z.code}`}>
                <span className={styles.zoneCode}>{z.code}</span> {z.name}
              </h2>
              <p className={styles.zoneMeta}>{z.location}</p>
            </div>
            <ul className={styles.list}>
              {items.map((exhibit) => {
                const band = bandName(exhibit.band)
                return (
                  <li key={exhibit.id}>
                    <Link href={`/exhibit/${exhibit.id}`} className={styles.row}>
                      <span className={styles.id}>{exhibit.id}</span>
                      <span className={styles.year}>{exhibit.year}</span>
                      <span className={styles.rowTitle}>
                        {exhibit.title}
                        {band ? <span className={styles.band}>{band}</span> : null}
                      </span>
                      <span className="badge" data-tier={exhibit.tier}>
                        {tierLabel(exhibit.tier)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </>
  )
}
