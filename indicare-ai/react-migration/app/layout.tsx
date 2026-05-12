import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'IndiCare Intelligence',
  description: 'Realtime conversational intelligence for residential care professionals'
}

export default function RootLayout({children}:{children:ReactNode}){
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  )
}
