import './globals.css'
import type { ReactNode } from 'react'
import { RealtimeProvider } from '../components/realtime/RealtimeProvider'

export const metadata = {
  title: 'IndiCare Intelligence',
  description: 'Realtime conversational intelligence for residential care professionals'
}

export default function RootLayout({children}:{children:ReactNode}){
  return (
    <html lang="en-GB">
      <body>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </body>
    </html>
  )
}
