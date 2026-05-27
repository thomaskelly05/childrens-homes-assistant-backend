'use client'

import Link from 'next/link'

export function ManagerActionButtons({
  childId,
  recordId
}: {
  childId: string
  recordId?: string
}) {
  const reviewHref = recordId
    ? `/record/reviews?child_id=${encodeURIComponent(childId)}&record_id=${encodeURIComponent(recordId)}`
    : `/record/reviews?child_id=${encodeURIComponent(childId)}`

  return (
    <div className="flex flex-wrap gap-2" data-testid="workspace-manager-actions">
      <Link
        href={reviewHref}
        className="inline-flex min-h-10 items-center rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-900"
      >
        Manager review
      </Link>
      <Link
        href={`/command-centre/briefing?child_id=${encodeURIComponent(childId)}`}
        className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
      >
        Daily brief
      </Link>
      <Link
        href={`/actions?child_id=${encodeURIComponent(childId)}`}
        className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
      >
        Actions
      </Link>
    </div>
  )
}
