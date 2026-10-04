import type { Metadata, Viewport } from 'next'
import { Chakra_Petch, IBM_Plex_Mono, VT323 } from 'next/font/google'
import type { CSSProperties } from 'react'
import { ZONES } from '@museum/content/zones'
import './globals.css'
import './museum-ui.css'

const display = Chakra_Petch({
  weight: ['600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display'
})

const body = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body'
})

const screen = VT323({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-screen'
})

const DESCRIPTION = 'A virtual museum showcasing major milestones in the history of Computer Science.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Hello Museum',
  description: DESCRIPTION,
  applicationName: 'Hello Museum',
  openGraph: {
    title: 'Hello Museum',
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'The atrium of Hello Museum' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello Museum',
    description: DESCRIPTION,
    images: ['/og.jpg']
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#f4f2ed'
}

const zoneInks = Object.fromEntries(
  ZONES.map((zone) => [`--zone-${zone.code.toLowerCase()}`, zone.ink])
) as CSSProperties

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${screen.variable}`}
      style={zoneInks}
    >
      <body>{children}</body>
    </html>
  )
}
