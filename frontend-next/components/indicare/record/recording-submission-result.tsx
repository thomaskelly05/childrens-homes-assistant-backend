'use client'

import Link from 'next/link'

import type { RecordingSubmissionResult } from '@/lib/os-api/recording-drafts'

type RecordingSubmissionResultCardProps = {
  result: RecordingSubmissionResult
  childId?: string
}

export function RecordingSubmissionResultCard({ result, childId }: RecordingSubmissionResultCardProps) {
  const formalLabel = result.formal_record_created ? 'yes' : 'no'
  const route = result.route_hint || result.frontend_route

  return (
    <section
      data-testid="recording-submission-result"
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900"
    >
      <h3 className="text-sm font-black text-slate-950">Submission result</h3>
      <dl className="mt-3 space-y-2 text-xs font-semibold">
        <div className="flex justify-between gap-4">
          <dt>Submitted</dt>
          <dd data-testid="recording-submission-submitted">{result.submitted ? 'Yes' : 'No'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Formal record created</dt>
          <dd data-testid="recording-submission-formal-created">{formalLabel}</dd>
        </div>
        {result.formal_record_type ? (
          <div className="flex justify-between gap-4">
            <dt>Record type</dt>
            <dd>{result.formal_record_type}</dd>
          </div>
        ) : null}
        {result.linked_record_id ? (
          <div className="flex justify-between gap-4">
            <dt>Linked record ID</dt>
            <dd data-testid="recording-submission-linked-record">{result.linked_record_id}</dd>
          </div>
        ) : null}
        {result.linked_chronology_id ? (
          <div className="flex justify-between gap-4">
            <dt>Chronology link</dt>
            <dd data-testid="recording-submission-chronology">{result.linked_chronology_id}</dd>
          </div>
        ) : null}
        {result.linked_archive_record_id ? (
          <div className="flex justify-between gap-4">
            <dt>Archive record</dt>
            <dd data-testid="recording-submission-archive">{result.linked_archive_record_id}</dd>
          </div>
        ) : null}
        {result.linked_plan_impact_ids && result.linked_plan_impact_ids.length > 0 ? (
          <div className="flex justify-between gap-4">
            <dt>Plan impacts</dt>
            <dd data-testid="recording-submission-plan-impacts">{result.linked_plan_impact_ids.join(', ')}</dd>
          </div>
        ) : null}
        {result.lifeecho_suggestion_ids && result.lifeecho_suggestion_ids.length > 0 ? (
          <div className="flex justify-between gap-4">
            <dt>LifeEcho suggestions</dt>
            <dd data-testid="recording-submission-lifeecho">{result.lifeecho_suggestion_ids.join(', ')}</dd>
          </div>
        ) : null}
      </dl>

      {result.formal_record_created === false &&
      (result.target_status === 'route_to_existing_workflow' ||
        result.target_status === 'submit_as_draft_only' ||
        result.target_status === 'unsupported') ? (
        <p
          className="mt-3 text-xs font-semibold text-amber-950"
          data-testid="recording-submission-not-wired"
        >
          Formal route is not fully wired yet for this recording type.
        </p>
      ) : null}

      {result.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {result.warnings.map((warning) => (
            <li key={warning} data-testid="recording-submission-warning">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      {result.review_required && !result.formal_record_created ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/record/reviews"
            data-testid="recording-submission-open-review-queue"
            className="inline-flex min-h-9 items-center rounded-xl bg-purple-600 px-3 py-1 text-xs font-black text-white"
          >
            Open review queue
          </Link>
          <Link
            href={
              result.draft_id
                ? `/record/alerts?draft_id=${encodeURIComponent(result.draft_id)}`
                : '/record/alerts'
            }
            data-testid="recording-submission-open-alerts"
            className="inline-flex min-h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-950"
          >
            Open alerts
          </Link>
        </div>
      ) : null}

      {result.next_steps.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-black text-slate-800">Next steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs font-semibold text-slate-700">
            {result.next_steps.map((step) => (
              <li key={step} data-testid="recording-submission-next-step">
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2" data-testid="recording-submission-lifecycle-links">
        {route && result.formal_record_created === false ? (
          <Link
            href={result.frontend_route || route}
            data-testid="recording-open-formal-route"
            className="inline-flex min-h-9 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-950"
          >
            Open formal route
          </Link>
        ) : null}
        {childId ? (
          <>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/archive`}
              data-testid="recording-open-child-archive"
              className="inline-flex min-h-9 items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-950"
            >
              Archive
            </Link>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/chronology`}
              data-testid="recording-open-child-chronology"
              className="inline-flex min-h-9 items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-950"
            >
              Chronology
            </Link>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/plan-impacts`}
              data-testid="recording-open-child-plan-impacts"
              className="inline-flex min-h-9 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-950"
            >
              Plan impacts
            </Link>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/lifeecho`}
              data-testid="recording-open-child-lifeecho"
              className="inline-flex min-h-9 items-center rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-black text-fuchsia-950"
            >
              LifeEcho
            </Link>
          </>
        ) : null}
        {childId ? (
          <Link
            href={`/young-people/${encodeURIComponent(childId)}/workspace`}
            data-testid="recording-open-child-journey"
            className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-800"
          >
            Child workspace
          </Link>
        ) : null}
        {result.draft_id ? (
          <Link
            href={`/record?draft=${encodeURIComponent(result.draft_id)}`}
            data-testid="recording-resume-draft"
            className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-800"
          >
            Resume draft
          </Link>
        ) : null}
      </div>
    </section>
  )
}
