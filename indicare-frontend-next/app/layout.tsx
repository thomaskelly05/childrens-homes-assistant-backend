import type { ReactNode } from 'react'

import './globals.css'
import './indicare-os-live.css'

export const metadata = {
  title: 'IndiCare OS',
  description: 'Child-centred operating system for Ofsted regulated children homes'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  )
}
