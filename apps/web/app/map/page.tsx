import type { Metadata } from 'next'
import { FloorMap, FloorMapLegend } from '@museum/scene/map'
import { SiteFooter } from '../../components/SiteFooter'
import { SiteHeader } from '../../components/SiteHeader'
import { building, exhibits } from '../../lib/museum-data'
import styles from '../museum.module.css'

export const metadata: Metadata = {
  title: 'Floor plan | Hello Museum',
  description: 'Interactive 2D floor plan of every exhibit in Hello Museum.'
}

export default function MapPage() {
  return (
    <div className="site">
      <SiteHeader />
      <main id="main" className={`site-main container ${styles.main}`}>
        <header className={styles.header}>
          <p className="kicker">Floor plan</p>
          <h1>The whole museum on one page</h1>
          <p className={styles.lede}>
            All {exhibits.length} exhibits in place. Tab through the markers in zone order, or click one to
            read its exhibit page.
          </p>
        </header>
        <div className={styles.mapLayout}>
          <div className={`panel ${styles.mapWrap}`}>
            <FloorMap building={building} exhibits={exhibits} />
          </div>
          <aside className={`panel ${styles.legend}`} aria-label="Map key">
            <FloorMapLegend building={building} exhibits={exhibits} />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
