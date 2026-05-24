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

  return (
    <section data-testid="recording-review-detail" className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-950">{draft.title?.trim() || 'Untitled draft'}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {draft.recording_type.replace(/-/g, ' ')}
              {draft.child_name ? ` · ${draft.child_name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <RecordingReviewStatusBadge status={draft.review_status} />
            <RecordingReviewPriorityBadge priority={(draft.metadata?.review_priority as string) || 'medium'} />
          </div>
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500" data-testid="recording-review-manager-judgement-detail">
          {MANAGER_JUDGEMENT_NOTICE}
        </p>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-800 whitespace-pre-wrap">
          {draft.body?.trim() || '(No body yet)'}
        </div>

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
              href={operationalOrbReviewHref('record_quality_review')}
              data-testid="recording-review-orb-quality"
              className="inline-flex min-h-8 items-center rounded-xl bg-slate-950 px-2 py-1 text-[10px] font-black text-white"
            >
              Open operational ORB
            </Link>
            <Link
              href={operationalOrbReviewHref('safeguarding_themes')}
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
              href={`/young-people/${encodeURIComponent(childId)}`}
              data-testid="recording-review-open-child-journey"
              className="inline-flex min-h-9 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-950"
            >
              Open child journey
            </Link>
          ) : null}
        </div>
      </div>

      <RecordingReviewActions detail={detail} onActionComplete={onActionComplete} />
    </section>
  )
}
