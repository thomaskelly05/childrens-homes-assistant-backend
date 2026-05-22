import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'ORB Care Companion',
  description: 'Standalone residential care assistant — no IndiCare OS records'
}

export default function OrbStandaloneLayout({ children }: { children: ReactNode }) {
  return children
}
