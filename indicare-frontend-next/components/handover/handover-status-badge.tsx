'use client'

import type { HandoverFormalStatus, HandoverReviewStatus } from '@/lib/os-api/handover-intelligence'

const REVIEW_TONES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800',
  awaiting_review: 'bg-amber-100 text-amber-900',
  changes_requested: 'bg-rose-100 text-rose-900',
  approved: 'bg-emerald-100 text-emerald-900',
  safeguarding_review_required: 'bg-violet-100 text-violet-900',
  completed: 'bg-emerald-50 text-emerald-800',
  archived: 'bg-slate-50 text-slate-600'
}

const FORMAL_TONES: Record<string, string> = {
  not_attempted: 'bg-slate-100 text-slate-700',
  created: 'bg-emerald-100 text-emerald-900',
  not_wired: 'bg-amber-100 text-amber-900',
  failed: 'bg-rose-100 text-rose-900'
}

export function HandoverReviewStatusBadge({ status }: { status: HandoverReviewStatus | string }) {
  const tone = REVIEW_TONES[status] || REVIEW_TONES.draft
  const label = String(status).replace(/_/g, ' ')
  return (
    <span
      data-testid="handover-review-status-badge"
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${tone}`}
    >
      {label}
    </span>
  )
}

export function HandoverFormalStatusBadge({ status }: { status: HandoverFormalStatus | string }) {
  const tone = FORMAL_TONES[status] || FORMAL_TONES.not_attempted
  return (
    <span
      data-testid="handover-formal-status-badge"
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${tone}`}
    >
      Formal: {String(status).replace(/_/g, ' ')}
    </span>
  )
}

export function HandoverTimelineBadge({ linked }: { linked: boolean }) {
  return (
    <span
      data-testid="handover-timeline-status-badge"
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
        linked ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700'
      }`}
    >
      Timeline linked: {linked ? 'yes' : 'no'}
    </span>
  )
}
