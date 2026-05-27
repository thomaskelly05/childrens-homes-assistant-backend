'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { RecordingGovernanceDashboard } from '@/components/indicare/record/recording-governance-dashboard'
import { PageHeader } from '@/components/indicare/ui'

export default function RecordingGovernancePage() {
  const searchParams = useSearchParams()
  const childIdRaw = searchParams.get('child_id')
  const childId = childIdRaw ? Number(childIdRaw) : undefined
  const childIdFilter = childId != null && Number.isFinite(childId) ? childId : undefined

  return (
    <main data-testid="recording-governance-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
      <PageHeader
        eyebrow="Manager oversight"
        title="Recording governance"
        description="Monitor recording quality, review backlog and high-risk recording activity. ORB supports oversight, but manager judgement remains required."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/record/reviews"
              className="inline-flex min-h-10 items-center rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-950"
            >
              Review queue
            </Link>
            <Link
              href="/intelligence/sccif"
              data-testid="recording-governance-sccif-link"
              className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-950"
            >
              SCCIF alignment
            </Link>
            <Link
              href="/record"
              className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
            >
              Back to recording
            </Link>
          </div>
        }
      />

      {childIdFilter != null ? (
        <p className="text-sm font-semibold text-slate-600">
          Scoped to child ID {childIdFilter}.{' '}
          <Link href="/record/governance" className="font-black text-blue-700 underline">
            Show all
          </Link>
        </p>
      ) : null}

      <RecordingGovernanceDashboard childIdFilter={childIdFilter} />
    </main>
  )
}
