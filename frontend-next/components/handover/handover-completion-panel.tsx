'use client'

import Link from 'next/link'

import type { HandoverDraftRecord } from '@/lib/os-api/handover-intelligence'

import {
  HandoverFormalStatusBadge,
  HandoverReviewStatusBadge,
  HandoverTimelineBadge
} from '@/components/handover/handover-status-badge'

export function HandoverCompletionPanel({
  draft,
  status,
  warnings
}: {
  draft?: HandoverDraftRecord | null
  status: string
  warnings: string[]
}) {
  const showStatus = draft || status === 'completed'
  if (!showStatus && !warnings.length) return null

  const reviewStatus = draft?.review_status || 'draft'
  const isCompleted = status === 'completed' || reviewStatus === 'completed'

  return (
    <section
      data-testid="handover-completion-panel"
      className={`rounded-2xl border p-4 ${
        isCompleted ? 'border-emerald-100 bg-emerald-50/80' : 'border-slate-100 bg-slate-50/80'
      }`}
    >
      {draft ? (
        <div className="flex flex-wrap gap-2">
          <HandoverReviewStatusBadge status={reviewStatus} />
          <HandoverFormalStatusBadge status={draft.formal_status || 'not_attempted'} />
          <HandoverTimelineBadge linked={Boolean(draft.timeline_linked)} />
        </div>
      ) : null}

      {draft?.manager_review_required && reviewStatus !== 'approved' && reviewStatus !== 'completed' ? (
        <p className="mt-3 text-xs font-semibold text-amber-900">
          Manager review required before completion.{' '}
          <Link href="/handover/reviews" className="font-black underline">
            Open review queue
          </Link>
        </p>
      ) : null}

      {isCompleted ? (
        <>
          <p className="mt-3 text-sm font-black text-emerald-900">Handover draft completed in workspace</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800" data-testid="handover-formal-record-created">
            Formal record created: {draft?.formal_record_created ? 'yes' : 'no'}
          </p>
          <p className="text-xs font-semibold leading-5 text-emerald-800" data-testid="handover-timeline-linked">
            Timeline linked: {draft?.timeline_linked ? 'yes' : 'no'}
          </p>
        </>
      ) : null}

      {(draft?.completion_warnings?.length ? draft.completion_warnings : warnings).map((w) => (
        <p key={w} className="mt-2 text-xs font-semibold text-slate-700">
          {w}
        </p>
      ))}

      {draft?.next_steps?.length ? (
        <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
          {draft.next_steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
