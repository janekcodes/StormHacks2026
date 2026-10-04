import Link from 'next/link'
import styles from '../app/museum.module.css'

export function SiteNav() {
  return (
    <nav className={styles.nav} aria-label="Museum">
      <Link href="/" className={styles.brand}>
        Hello Museum
      </Link>
      <Link href="/visit" className={styles.navLink}>
        Visit
      </Link>
      <Link href="/map" className={styles.navLink}>
        Floor plan
      </Link>
      <Link href="/exhibits" className={styles.navLink}>
        Exhibits
      </Link>
    </nav>
  )
}
