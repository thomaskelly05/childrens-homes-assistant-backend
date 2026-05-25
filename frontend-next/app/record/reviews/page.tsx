'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { RecordingReviewQueue } from '@/components/indicare/record/recording-review-queue'
import { PageHeader } from '@/components/indicare/ui'

export default function RecordingReviewsPage() {
  const searchParams = useSearchParams()
  const childIdRaw = searchParams.get('child_id')
  const homeIdRaw = searchParams.get('home_id')
  const childId = childIdRaw ? Number(childIdRaw) : undefined
  const homeId = homeIdRaw ? Number(homeIdRaw) : undefined
  const childIdFilter = childId != null && Number.isFinite(childId) ? childId : undefined
  const homeIdFilter = homeId != null && Number.isFinite(homeId) ? homeId : undefined

  return (
    <main data-testid="recording-reviews-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
      <PageHeader
        eyebrow="Manager review"
        title="Recording review queue"
        description="Review high-risk, safeguarding-sensitive or manager-review drafts before they become formal records."
        action={
          <Link
            href="/record"
            className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
          >
            Back to /record
          </Link>
        }
      />

      {childIdFilter != null ? (
        <p className="text-sm font-semibold text-slate-600">
          Filtered to child ID {childIdFilter}.{' '}
          <Link href="/record/reviews" className="font-black text-blue-700 underline">
            Show all
          </Link>
        </p>
      ) : null}
      {homeIdFilter != null && childIdFilter == null ? (
        <p className="text-sm font-semibold text-slate-600">
          Filtered to home ID {homeIdFilter}.{' '}
          <Link href="/record/reviews" className="font-black text-blue-700 underline">
            Show all
          </Link>
        </p>
      ) : null}

      <RecordingReviewQueue childIdFilter={childIdFilter} homeIdFilter={homeIdFilter} />
    </main>
  )
}
