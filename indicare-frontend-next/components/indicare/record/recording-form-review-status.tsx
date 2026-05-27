'use client'

export function RecordingFormReviewStatus({
  reviewStatus,
  managerReviewRequired,
  safeguardingReviewRequired
}: {
  reviewStatus?: string
  managerReviewRequired?: boolean
  safeguardingReviewRequired?: boolean
}) {
  const badges: Array<{ label: string; className: string; testId: string }> = []

  if (managerReviewRequired) {
    badges.push({
      label: 'Manager review',
      className: 'bg-amber-100 text-amber-950',
      testId: 'recording-badge-manager-review'
    })
  }
  if (safeguardingReviewRequired) {
    badges.push({
      label: 'Safeguarding review',
      className: 'bg-rose-100 text-rose-950',
      testId: 'recording-badge-safeguarding-review'
    })
  }
  if (reviewStatus && reviewStatus !== 'not_required') {
    badges.push({
      label: reviewStatus.replace(/_/g, ' '),
      className: 'bg-violet-100 text-violet-950',
      testId: 'recording-badge-review-status'
    })
  }

  if (!badges.length) {
    return (
      <span
        data-testid="recording-badge-no-review"
        className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-900"
      >
        No review required
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="recording-form-review-status">
      {badges.map((badge) => (
        <span
          key={badge.testId}
          data-testid={badge.testId}
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}
