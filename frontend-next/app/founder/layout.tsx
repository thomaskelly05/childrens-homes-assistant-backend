import type { Metadata } from 'next'

import './founder-dashboard.css'

export const metadata: Metadata = {
  title: 'IndiCare Intelligence Command Centre',
  description: 'Founder-only operating dashboard for IndiCare Intelligence.',
  robots: {
    index: false,
    follow: false
  }
}

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return <div className="founder-route-root min-h-screen bg-[#05070d] text-slate-100">{children}</div>
}
