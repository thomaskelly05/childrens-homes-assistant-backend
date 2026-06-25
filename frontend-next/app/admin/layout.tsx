import type { Metadata } from 'next'

import { AdminGuard } from '@/components/admin-command-centre/admin-guard'

import '../founder/founder-dashboard.css'

export const metadata: Metadata = {
  title: 'Admin Command Centre · ORB Residential',
  description: 'Founder/admin-only operational console for ORB Residential SaaS platform.',
  robots: {
    index: false,
    follow: false
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="founder-route-root min-h-screen bg-[#05070d] text-slate-100">
      <AdminGuard>{children}</AdminGuard>
    </div>
  )
}
