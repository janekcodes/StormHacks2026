import type { Metadata } from 'next'
import { ZONES } from '@museum/content/zones'
import { ExhibitsBrowser } from '../../components/ExhibitsBrowser'
import { GuideWidget } from '../../components/GuideWidget'
import { SiteFooter } from '../../components/SiteFooter'
import { SiteHeader } from '../../components/SiteHeader'
import { exhibits } from '../../lib/museum-data'
import styles from '../museum.module.css'

export const metadata: Metadata = {
  title: 'Exhibits | Hello Museum',
  description: 'Every exhibit in Hello Museum, by gallery and status.'
}

export default function ExhibitsPage() {
  const built = exhibits.filter((exhibit) => exhibit.tier === 'built').length
  return (
    <div className="site">
      <SiteHeader />
      <main id="main" className={`site-main container ${styles.main}`}>
        <header className={styles.header}>
          <p className="kicker">The collection</p>
          <h1>Exhibits</h1>
          <p className={styles.lede}>
            {exhibits.length} milestones across the galleries. {built} are built and on display with a working
            portal; the rest are planned and hold their place on the floor.
          </p>
        </header>
        <ExhibitsBrowser exhibits={exhibits} zones={ZONES} />
      </main>
      <SiteFooter />
      <GuideWidget exhibits={exhibits} />
    </div>
  )
}
