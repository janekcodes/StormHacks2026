import type { Metadata } from 'next'
import { FloorMap } from '@museum/scene/map'
import { SiteNav } from '../../components/SiteNav'
import { building, exhibits } from '../../lib/museum-data'
import styles from '../museum.module.css'

export const metadata: Metadata = {
  title: 'Floor plan | The NeXT-Gen Museum',
  description: 'Interactive 2D floor plan of every exhibit in the NeXT-Gen Museum.'
}

export default function MapPage() {
  return (
    <div className={styles.shell}>
      <SiteNav />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Floor plan</h1>
          <p className={styles.lede}>
            All 77 exhibits on one map. Tab through markers in zone order, or click a marker to open
            its page.
          </p>
        </header>
        <div className={styles.mapWrap}>
          <FloorMap building={building} exhibits={exhibits} />
        </div>
      </main>
    </div>
  )
}
