import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner container">
        <p>
          Hello Museum is a virtual museum of computer science. Each exhibit page lists its sources and any
          caveats.
        </p>
        <nav aria-label="Footer">
          <ul>
            <li>
              <Link href="/visit">Visit in 3D</Link>
            </li>
            <li>
              <Link href="/map">Floor plan</Link>
            </li>
            <li>
              <Link href="/exhibits">All exhibits</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
