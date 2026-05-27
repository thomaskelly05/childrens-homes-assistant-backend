'use client'

import Link from 'next/link'

import { RecordingReviewActions } from '@/components/indicare/record/recording-review-actions'
import {
  RecordingReviewPriorityBadge,
  RecordingReviewStatusBadge
} from '@/components/indicare/record/recording-review-status-badge'
import {
  MANAGER_JUDGEMENT_NOTICE,
  operationalOrbReviewHref,
  type RecordingReviewDetail
} from '@/lib/os-api/recording-reviews'
import { RecordingFormLifecycleOutcome } from '@/components/indicare/record/recording-form-lifecycle-outcome'
import { RecordingFormReviewStatus } from '@/components/indicare/record/recording-form-review-status'
import { parseFormRecordMetadata } from '@/lib/record/recording-form-metadata'
import { lifecycleForForm } from '@/lib/record/recording-form-lifecycle'
import { guidanceForForm } from '@/lib/record/recording-form-guidance'

function copyPromptToClipboard(prompt: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    void navigator.clipboard.writeText(prompt)
  }
}

export function RecordingReviewDetailPanel({
  detail,
  onActionComplete
}: {
  detail: RecordingReviewDetail
  onActionComplete?: () => void
}) {
  const draft = detail.draft
  const childId = draft.child_id != null ? String(draft.child_id) : undefined
  const draftHref = `/record?draft_id=${encodeURIComponent(draft.id)}`
  const formRecord = parseFormRecordMetadata(draft.metadata)
  const eventDate = draft.event_date || formRecord?.event_date
  const writtenBy = draft.created_by_name || formRecord?.written_by_name
  const lifecycle = lifecycleForForm(draft.form_id || draft.recording_type, draft.category || undefined)
  const signOffMeta = draft.metadata?.review_signoff as { lifecycle?: { archive_record_id?: string } } | undefined
  const formGuidance = guidanceForForm(draft.form_id || draft.recording_type)
  const readinessLabel =
    draft.safeguarding_review_required
      ? 'Safeguarding review required'
      : draft.manager_review_required
        ? 'Ready for manager review'
        : draft.quality_flags?.length || draft.language_flags?.length
          ? 'Needs changes'
          : 'Ready for manager review'

  return (
    <section data-testid="recording-review-detail" className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-950">{draft.title?.trim() || 'Untitled draft'}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-600" data-testid="recording-review-form-type">
              {draft.recording_type.replace(/-/g, ' ')}
              {draft.child_name ? ` · ${draft.child_name}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
              {eventDate ? (
                <span data-testid="recording-review-event-date">Event date: {eventDate}</span>
              ) : null}
              {writtenBy ? (
                <span data-testid="recording-review-written-by">Written by: {writtenBy}</span>
              ) : null}
            </div>
          </div>
          <RecordingFormReviewStatus
            reviewStatus={draft.review_status}
            managerReviewRequired={draft.manager_review_required}
            safeguardingReviewRequired={draft.safeguarding_review_required}
          />
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500" data-testid="recording-review-manager-judgement-detail">
          {MANAGER_JUDGEMENT_NOTICE}
        </p>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-800 whitespace-pre-wrap">
          {draft.body?.trim() || '(No body yet)'}
        </div>

        {draft.structured_template_id ? (
          <div className="mt-4 space-y-3" data-testid="recording-review-structured-summary">
            <p className="text-xs font-black text-slate-800">
              Structured template: {draft.structured_template_id}
            </p>
            {(draft.structured_summary as { lines?: string[] })?.lines?.length ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                <p className="text-xs font-black text-rose-950">Structured summary</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-slate-700">
                  {((draft.structured_summary as { lines?: string[] }).lines || []).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {draft.structured_review_triggers?.length ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3" data-testid="recording-review-structured-triggers">
                <p className="text-xs font-black text-amber-950">Structured review triggers</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold text-amber-900">
                  {draft.structured_review_triggers.map((trigger) => (
                    <li key={trigger}>{trigger}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(draft.structured_completion as { required_missing?: string[] })?.required_missing?.length ? (
              <p className="text-xs font-black text-rose-800" data-testid="recording-review-structured-missing">
                Required structured fields missing:{' '}
                {(draft.structured_completion as { required_missing?: string[] }).required_missing?.join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        {(draft.quality_flags?.length || draft.language_flags?.length) ? (
          <div className="mt-3">
            <p className="text-xs font-black text-slate-800">Quality flags</p>
            <ul className="mt-1 list-disc pl-4 text-xs font-semibold text-amber-900">
              {[...(draft.quality_flags || []), ...(draft.language_flags || [])].map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.privacy_flags?.length ? (
          <div className="mt-3">
            <p className="text-xs font-black text-slate-800">Privacy flags</p>
            <ul className="mt-1 list-disc pl-4 text-xs font-semibold text-slate-700">
              {draft.privacy_flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {Object.keys(draft.checklist_status || {}).length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-black text-slate-800">Checklist</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-100 p-2 text-[10px]">
              {JSON.stringify(draft.checklist_status, null, 2)}
            </pre>
          </div>
        ) : null}

        {(formRecord?.child_voice_present != null || formRecord?.adult_response_present != null) ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black" data-testid="recording-review-therapeutic-checklist">
            <span className={formRecord.child_voice_present ? 'text-emerald-800' : 'text-amber-800'}>
              Child voice {formRecord.child_voice_present ? 'present' : 'not detected'}
            </span>
            <span className={formRecord.adult_response_present ? 'text-emerald-800' : 'text-amber-800'}>
              Adult response {formRecord.adult_response_present ? 'present' : 'not detected'}
            </span>
          </div>
        ) : null}

        <section
          className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4"
          data-testid="recording-review-quality-summary"
        >
          <p className="text-xs font-black text-cyan-950">ORB / live coach quality summary</p>
          <p className="mt-1 text-xs font-semibold text-cyan-900">{formGuidance.purpose}</p>
          <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-2">
            <span data-testid="recording-review-readiness-status">Readiness: {readinessLabel}</span>
            <span data-testid="recording-review-signoff-recommendation">Sign-off: {readinessLabel}</span>
            {eventDate ? <span>Event date: {eventDate}</span> : <span className="text-amber-800">Event date missing</span>}
            {writtenBy ? <span>Written by: {writtenBy}</span> : null}
            <span>
              Plan impact considered:{' '}
              {formRecord?.actions_required ? 'Yes' : 'Not flagged'}
            </span>
            <span>
              Therapeutic language flags: {(draft.language_flags || []).length || 'None'}
            </span>
            <span>
              Missing information flags: {(draft.quality_flags || []).length || 'None'}
            </span>
          </div>
          {(draft.quality_flags?.length || draft.language_flags?.length) ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold text-amber-900">
              {[...(draft.quality_flags || []), ...(draft.language_flags || [])].slice(0, 6).map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs font-semibold text-emerald-800">No outstanding quality flags from live coach.</p>
          )}
        </section>

        {childId ? (
          <div className="mt-4" data-testid="recording-review-lifecycle-outcome">
            <RecordingFormLifecycleOutcome
              lifecycle={lifecycle}
              links={{
                archiveHref: `/young-people/${childId}/archive`,
                chronologyHref: `/young-people/${childId}/chronology`,
                planImpactsHref: `/young-people/${childId}/plan-impacts`,
                lifeechoHref: `/young-people/${childId}/lifeecho`,
                formalRecordId: draft.linked_record_id || undefined,
                archiveRecordId: signOffMeta?.lifecycle?.archive_record_id
              }}
              signOffSummary={
                (draft.metadata?.review_signoff as { outcome?: string })?.outcome ||
                (detail.submission_target as { route_hint?: string })?.route_hint
              }
            />
          </div>
        ) : null}

        <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
          <p className="text-xs font-black text-cyan-900">ORB review prompts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.suggested_review_prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => copyPromptToClipboard(prompt)}
                className="rounded-xl border border-cyan-200 bg-white px-2 py-1 text-[10px] font-black text-cyan-950"
              >
                Copy: {prompt.slice(0, 36)}…
              </button>
            ))}
            <Link
              href={operationalOrbReviewHref('record_quality_review', { childId })}
              data-testid="recording-review-orb-quality"
              className="inline-flex min-h-8 items-center rounded-xl bg-slate-950 px-2 py-1 text-[10px] font-black text-white"
            >
              Sign-off readiness
            </Link>
            <Link
              href={operationalOrbReviewHref('plan_impact_review', { childId })}
              data-testid="recording-review-orb-plan-impacts"
              className="inline-flex min-h-8 items-center rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-950"
            >
              Plan impacts
            </Link>
            <Link
              href={operationalOrbReviewHref('archive_summary', { childId })}
              data-testid="recording-review-orb-archive"
              className="inline-flex min-h-8 items-center rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-950"
            >
              Before archiving
            </Link>
            <Link
              href={operationalOrbReviewHref('lifeecho_memory_support', { childId })}
              data-testid="recording-review-orb-lifeecho"
              className="inline-flex min-h-8 items-center rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-[10px] font-black text-fuchsia-950"
            >
              LifeEcho suitability
            </Link>
            <Link
              href={operationalOrbReviewHref('safeguarding_themes', { childId })}
              data-testid="recording-review-orb-safeguarding"
              className="inline-flex min-h-8 items-center rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-800"
            >
              Safeguarding themes
            </Link>
          </div>
        </div>

        <div className="mt-3 text-xs font-semibold text-slate-600">
          <p>
            Formal submit supported:{' '}
            {(detail.submission_target as { formal_submit_supported?: boolean })?.formal_submit_supported
              ? 'Yes'
              : 'No — approval does not create a formal record until route is wired.'}
          </p>
          {(detail.submission_target as { route_hint?: string })?.route_hint ? (
            <p className="mt-1">{(detail.submission_target as { route_hint?: string }).route_hint}</p>
          ) : null}
        </div>

        {detail.review_history.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-black text-slate-800">Review history</p>
            <ul className="mt-2 space-y-2">
              {detail.review_history.map((event) => (
                <li key={event.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-black">{event.decision.replace(/_/g, ' ')}</span>
                  {event.reviewer_name ? ` · ${event.reviewer_name}` : ''}
                  {event.comments ? <p className="mt-1 text-slate-600">{event.comments}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={draftHref}
            data-testid="recording-review-open-draft"
            className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
          >
            Open draft in /record
          </Link>
          {childId ? (
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/workspace`}
              data-testid="recording-review-open-child-workspace"
              className="inline-flex min-h-9 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-950"
            >
              Open child workspace
            </Link>
          ) : null}
          {childId && draft.linked_record_id ? (
            <Link
              href={`/young-people/${encodeURIComponent(childId)}/archive`}
              data-testid="recording-review-open-archive"
              className="inline-flex min-h-9 items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-950"
            >
              Open archive
            </Link>
          ) : null}
          <Link
            href={
              childId
                ? `/record/alerts?child_id=${encodeURIComponent(childId)}&draft_id=${encodeURIComponent(draft.id)}`
                : `/record/alerts?draft_id=${encodeURIComponent(draft.id)}`
            }
            data-testid="recording-review-open-alerts"
            className="inline-flex min-h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-950"
          >
            Open alerts
          </Link>
        </div>
      </div>

      <RecordingReviewActions detail={detail} onActionComplete={onActionComplete} />
    </section>
  )
}
