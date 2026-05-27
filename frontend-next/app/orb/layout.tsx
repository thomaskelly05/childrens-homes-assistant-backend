import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'ORB',
  description: 'Institutional cognition workspace for residential children\'s homes — standalone, no OS records'
}

export default function OrbStandaloneLayout({ children }: { children: ReactNode }) {
  return children
}
