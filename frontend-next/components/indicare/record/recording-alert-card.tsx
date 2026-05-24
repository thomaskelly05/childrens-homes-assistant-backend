'use client'

import Link from 'next/link'

import type { RecordingAlertRecord } from '@/lib/os-api/recording-alerts'
import { operationalOrbAlertHref } from '@/lib/os-api/recording-alerts'

const SEVERITY_TONE: Record<string, string> = {
  urgent: 'border-rose-300 bg-rose-50',
  high: 'border-amber-200 bg-amber-50',
  medium: 'border-blue-100 bg-blue-50/70',
  low: 'border-slate-100 bg-slate-50'
}

export function RecordingAlertCard({
  alert,
  selected,
  onSelect
}: {
  alert: RecordingAlertRecord
  selected: boolean
  onSelect: () => void
}) {
  const draftHref = alert.draft_id ? `/record?draft_id=${encodeURIComponent(alert.draft_id)}` : null
  const reviewHref =
    alert.route ||
    (alert.draft_id ? `/record/reviews?draft_id=${encodeURIComponent(alert.draft_id)}` : null)
  const childHref =
    alert.child_id != null ? `/young-people/${alert.child_id}/journey` : null

  return (
    <article
      data-testid={`recording-alert-card-${alert.id}`}
      className={`rounded-2xl border px-4 py-3 cursor-pointer transition ${
        SEVERITY_TONE[alert.severity] || SEVERITY_TONE.medium
      } ${selected ? 'ring-2 ring-blue-400' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">
          {alert.severity}
        </span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
          {alert.status}
        </span>
      </div>
      <p className="mt-2 text-sm font-black text-slate-950">{alert.title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-700" data-testid="recording-alert-safe-summary">
        {alert.safe_summary || alert.description}
      </p>
      <dl className="mt-2 grid gap-1 text-[11px] font-semibold text-slate-600 sm:grid-cols-2">
        {alert.child_name ? (
          <div>
            <dt className="inline text-slate-500">Young person: </dt>
            <dd className="inline">{alert.child_name}</dd>
          </div>
        ) : null}
        {alert.recording_type ? (
          <div>
            <dt className="inline text-slate-500">Type: </dt>
            <dd className="inline">{alert.recording_type}</dd>
          </div>
        ) : null}
        {alert.due_at ? (
          <div>
            <dt className="inline text-slate-500">Due: </dt>
            <dd className="inline">{new Date(alert.due_at).toLocaleDateString()}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        {reviewHref ? (
          <Link
            href={reviewHref}
            data-testid="recording-alert-open-review"
            className="text-xs font-black text-blue-700 underline"
          >
            Open review
          </Link>
        ) : null}
        {draftHref ? (
          <Link
            href={draftHref}
            data-testid="recording-alert-open-draft"
            className="text-xs font-black text-blue-700 underline"
          >
            Open draft
          </Link>
        ) : null}
        {childHref ? (
          <Link
            href={childHref}
            data-testid="recording-alert-open-child-journey"
            className="text-xs font-black text-blue-700 underline"
          >
            Open child journey
          </Link>
        ) : null}
        <Link
          href={operationalOrbAlertHref('record_quality_review', 'Help me understand this recording alert')}
          data-testid="recording-alert-ask-os-orb"
          className="text-xs font-black text-indigo-700 underline"
        >
          Ask OS ORB
        </Link>
      </div>
    </article>
  )
}
