import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Visit | Hello Museum',
  description: 'Walk the galleries of Hello Museum in 3D and open each exhibit.'
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0c0e10'
}

export default function VisitLayout({ children }: { children: React.ReactNode }) {
  return children
}
