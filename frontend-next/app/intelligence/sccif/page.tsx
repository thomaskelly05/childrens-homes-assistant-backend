'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { SccifAlignmentDashboard } from '@/components/intelligence-sccif/sccif-alignment-dashboard'
import { PageHeader } from '@/components/indicare/ui'
import type { SccifAlignmentFilters } from '@/lib/os-api/sccif-alignment'

export default function SccifAlignmentPage() {
  const searchParams = useSearchParams()
  const childIdRaw = searchParams.get('child_id')
  const staffId = searchParams.get('staff_id') || undefined
  const childId = childIdRaw ? Number(childIdRaw) : undefined
  const filters: SccifAlignmentFilters = {}
  if (childId != null && Number.isFinite(childId)) filters.child_id = childId
  if (staffId) filters.staff_id = staffId

  return (
    <main data-testid="sccif-alignment-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
      <PageHeader
        eyebrow="Inspection evidence support"
        title="SCCIF and Quality Standards alignment"
        description="Map safe operational evidence to Ofsted's SCCIF judgement areas and the Children's Homes Quality Standards. This supports preparation and oversight; it does not predict inspection outcomes."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/command-centre"
              className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
            >
              Care Hub
            </Link>
            <Link
              href="/record/governance"
              className="inline-flex min-h-10 items-center rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-950"
            >
              Recording governance
            </Link>
          </div>
        }
      />

      <SccifAlignmentDashboard filters={Object.keys(filters).length ? filters : undefined} />
    </main>
  )
}
