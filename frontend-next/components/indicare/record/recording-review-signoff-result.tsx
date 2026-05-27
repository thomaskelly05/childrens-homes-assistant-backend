'use client'

import Link from 'next/link'

import type { RecordingReviewActionResult } from '@/lib/os-api/recording-reviews'

const UNSUPPORTED_MESSAGE =
  'This review was approved, but no formal record route is wired for this recording type yet. It has not been added to the formal archive.'

const BLOCKED_MESSAGE =
  'Formal sign-off is blocked until safeguarding/manager review is complete.'

export function RecordingReviewSignoffResultCard({
  result,
  childId
}: {
  result: RecordingReviewActionResult
  childId?: string
}) {
  const lifecycleWarnings = result.lifecycle_warnings?.length
    ? result.lifecycle_warnings
    : result.warnings
  const lifecycleSteps = result.lifecycle_next_steps?.length
    ? result.lifecycle_next_steps
    : result.next_steps

  const showUnsupported =
    result.decision === 'approve' &&
    result.sign_off_status === 'approved_no_formal_route' &&
    !result.formal_record_created

  const showBlocked =
    result.sign_off_status === 'blocked_safeguarding_review' ||
    result.sign_off_status === 'blocked_manager_review'

  return (
    <section
      data-testid="recording-review-signoff-result"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-sm text-slate-900"
    >
      <h3 className="text-sm font-black text-emerald-950">Manager review sign-off result</h3>
      <p className="mt-1 text-xs font-semibold text-emerald-900" data-testid="recording-review-approved-label">
        {result.success ? 'Manager review approved' : 'Review action did not complete'}
      </p>

      <dl className="mt-3 space-y-2 text-xs font-semibold">
        <div className="flex justify-between gap-4">
          <dt>Formal record created</dt>
          <dd data-testid="recording-review-formal-created">{result.formal_record_created ? 'yes' : 'no'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Archive record</dt>
          <dd data-testid="recording-review-archive">
            {result.linked_archive_record_id ? result.linked_archive_record_id : 'not created'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Chronology story</dt>
          <dd data-testid="recording-review-chronology">
            {result.linked_chronology_id ? result.linked_chronology_id : 'not created'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Plan impacts</dt>
          <dd data-testid="recording-review-plan-impacts">
            {result.linked_plan_impact_ids?.length ?? 0}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>LifeEcho suggestions</dt>
          <dd data-testid="recording-review-lifeecho">
            {result.lifeecho_suggestion_ids?.length ?? 0}
          </dd>
        </div>
      </dl>

      {showUnsupported ? (
        <p className="mt-3 text-xs font-semibold text-amber-950" data-testid="recording-review-unsupported-formal">
          {UNSUPPORTED_MESSAGE}
        </p>
      ) : null}

      {showBlocked ? (
        <p className="mt-3 text-xs font-semibold text-rose-950" data-testid="recording-review-signoff-blocked">
          {BLOCKED_MESSAGE}
        </p>
      ) : null}

      {lifecycleWarnings.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {lifecycleWarnings.map((warning) => (
            <li key={warning} data-testid="recording-review-lifecycle-warning">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      {lifecycleSteps.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-black text-slate-800">Next steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs font-semibold text-slate-700">
            {lifecycleSteps.map((step) => (
              <li key={step} data-testid="recording-review-lifecycle-next-step">
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2" data-testid="recording-review-lifecycle-links">
        {childId ? (
          <>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/archive`}
              data-testid="recording-review-open-archive"
              className="inline-flex min-h-9 items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-950"
            >
              Archive
            </Link>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/chronology`}
              data-testid="recording-review-open-chronology"
              className="inline-flex min-h-9 items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-950"
            >
              Chronology
            </Link>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/plan-impacts`}
              data-testid="recording-review-open-plan-impacts"
              className="inline-flex min-h-9 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-950"
            >
              Plan impacts
            </Link>
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/lifeecho`}
              data-testid="recording-review-open-lifeecho"
              className="inline-flex min-h-9 items-center rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-black text-fuchsia-950"
            >
              LifeEcho
            </Link>
          </>
        ) : null}
        {childId ? (
          <Link
            href={`/young-people/${encodeURIComponent(childId)}/workspace`}
            data-testid="recording-review-return-workspace"
            className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-800"
          >
            Return to child workspace
          </Link>
        ) : null}
      </div>
    </section>
  )
}
