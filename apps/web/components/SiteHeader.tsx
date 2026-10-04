'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/map', label: 'Floor plan' },
  { href: '/exhibits', label: 'Exhibits' }
] as const

function isCurrent(pathname: string, href: string): boolean {
  if (href === '/exhibits') return pathname === '/exhibits' || pathname.startsWith('/exhibit/')
  return pathname === href
}

/** Site header with skip link. `night` is the dark variant used above the 3D museum. */
export function SiteHeader({ night = false, mainId = 'main' }: { night?: boolean; mainId?: string }) {
  const pathname = usePathname() ?? '/'
  return (
    <>
      <a className="skip-link" href={`#${mainId}`}>
        Skip to content
      </a>
      <header className={night ? 'site-header theme-night' : 'site-header'}>
        <div className={night ? 'site-header-inner site-header-inner--wide' : 'site-header-inner container'}>
          <Link href="/" className="site-brand" aria-current={pathname === '/' ? 'page' : undefined}>
            <span className="site-brand-mark" aria-hidden="true">
              HM
            </span>
            <span className="site-brand-text">Hello Museum</span>
          </Link>
          <nav className="site-nav" aria-label="Primary">
            <ul>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {pathname === '/visit' ? null : (
                <li>
                  <Link href="/visit" className="site-nav-cta">
                    Visit
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>
    </>
  )
}
