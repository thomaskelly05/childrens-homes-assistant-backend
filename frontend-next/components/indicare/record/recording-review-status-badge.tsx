'use client'

export function RecordingReviewStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  const tone =
    status === 'approved' || status === 'reviewed' || status === 'submitted'
      ? 'bg-emerald-100 text-emerald-900'
      : status === 'changes_requested'
        ? 'bg-amber-100 text-amber-950'
        : status === 'safeguarding_escalation_required' || status === 'safeguarding_review_required'
          ? 'bg-rose-100 text-rose-950'
          : status === 'urgent' || status === 'awaiting_review'
            ? 'bg-purple-100 text-purple-900'
            : 'bg-slate-100 text-slate-800'

  return (
    <span
      data-testid={`recording-review-status-${status}`}
      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  )
}

export function RecordingReviewPriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === 'urgent'
      ? 'bg-rose-100 text-rose-950'
      : priority === 'high'
        ? 'bg-amber-100 text-amber-950'
        : priority === 'medium'
          ? 'bg-blue-100 text-blue-900'
          : 'bg-slate-100 text-slate-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}>
      {priority}
    </span>
  )
}
