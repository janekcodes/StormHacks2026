import Link from 'next/link'
import styles from './page.module.css'

export default function Page() {
  return (
    <main className={styles.main}>
      <h1>Hello Museum</h1>
      <p>The foundation is in place. Exhibits open soon.</p>
      <p>
        <Link href="/map">Floor plan</Link>
        {' · '}
        <Link href="/exhibits">Exhibits</Link>
      </p>
    </main>
  )
}
