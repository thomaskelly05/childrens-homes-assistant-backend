import type { Metadata } from 'next'

import { FounderPersistenceHydrator } from '@/components/founder/founder-persistence-hydrator'

import '../founder/founder-dashboard.css'

export const metadata: Metadata = {
  title: 'IndiCare Lab · ORB Residential',
  description: 'Founder-only intelligence and improvement console for ORB Residential.',
  robots: {
    index: false,
    follow: false
  }
}

export default function IndiCareLabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="founder-route-root min-h-screen bg-[#05070d] text-slate-100">
      <FounderPersistenceHydrator />
      {children}
    </div>
  )
}
