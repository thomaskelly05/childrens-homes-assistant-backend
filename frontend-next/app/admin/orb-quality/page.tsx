import Link from 'next/link'

import { OrbQualityDashboard } from '@/components/admin/orb-quality-dashboard'
import { PageHeader } from '@/components/indicare/ui'

export default function OrbAdminQualityPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-12">
      <PageHeader
        eyebrow="ORB Admin"
        title="Quality review & billing readiness"
        description="Review standalone ORB feedback, recurring gaps, improvement candidates and usage before paid subscriptions launch. Improvements require admin approval."
        action={
          <Link
            href="/orb"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            Back to ORB
          </Link>
        }
      />
      <OrbQualityDashboard />
    </div>
  )
}
