import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hello Museum',
  description: 'An interactive museum of computer science history.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
