'use client'

import { useState } from 'react'

import { RecordingReviewSignoffResultCard } from '@/components/indicare/record/recording-review-signoff-result'
import {
  applyRecordingReviewAction,
  MANAGER_JUDGEMENT_NOTICE,
  type RecordingReviewActionPayload,
  type RecordingReviewActionResult,
  type RecordingReviewDetail
} from '@/lib/os-api/recording-reviews'

export function RecordingReviewActions({
  detail,
  onActionComplete
}: {
  detail: RecordingReviewDetail
  onActionComplete?: (result: RecordingReviewActionResult) => void
}) {
  const [comments, setComments] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<RecordingReviewActionResult | null>(null)
  const draftId = detail.draft.id
  const childId = detail.draft.child_id != null ? String(detail.draft.child_id) : undefined
  const formalSupported = Boolean(
    (detail.submission_target as { formal_submit_supported?: boolean })?.formal_submit_supported
  )

  const runAction = async (payload: RecordingReviewActionPayload) => {
    setBusy(true)
    setActionError(null)
    try {
      const result = await applyRecordingReviewAction(draftId, {
        ...payload,
        comments: comments.trim() || payload.comments
      })
      if (result.ok) {
        setLastResult(result.data)
        onActionComplete?.(result.data)
      } else {
        setActionError(result.error || 'Review action could not complete. Please retry.')
      }
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Review action could not complete. Please retry.')
      if (process.env.NODE_ENV === 'development') {
        console.error('[recording-review]', caught)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section data-testid="recording-review-actions" className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-600" data-testid="recording-review-manager-judgement">
        {MANAGER_JUDGEMENT_NOTICE}
      </p>

      <label className="mt-4 block">
        <span className="text-xs font-black text-slate-800">Manager review comments</span>
        <textarea
          data-testid="recording-review-comments"
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Comments for the creator and audit trail"
        />
      </label>

      {actionError ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900" role="alert" data-testid="recording-review-action-error">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          data-testid="recording-review-approve"
          onClick={() => void runAction({ decision: 'approve' })}
          className="inline-flex min-h-9 items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          data-testid="recording-review-request-changes"
          onClick={() => void runAction({ decision: 'request_changes' })}
          className="inline-flex min-h-9 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-950 disabled:opacity-50"
        >
          Request changes
        </button>
        <button
          type="button"
          disabled={busy}
          data-testid="recording-review-safeguarding-escalation"
          onClick={() => void runAction({ decision: 'mark_safeguarding_escalation' })}
          className="inline-flex min-h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-950 disabled:opacity-50"
        >
          Mark safeguarding escalation
        </button>
        <button
          type="button"
          disabled={busy}
          data-testid="recording-review-mark-reviewed"
          onClick={() => void runAction({ decision: 'mark_reviewed', confirm_reviewed: true })}
          className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-50"
        >
          Mark reviewed
        </button>
        {formalSupported ? (
          <button
            type="button"
            disabled={busy}
            data-testid="recording-review-submit-after-approval"
            onClick={() =>
              void runAction({
                decision: 'submit_after_approval',
                submit_after_approval: true,
                confirm_reviewed: true
              })
            }
            className="inline-flex min-h-9 items-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            Submit after approval
          </button>
        ) : null}
      </div>

      {lastResult &&
      (lastResult.decision === 'approve' || lastResult.decision === 'submit_after_approval') ? (
        <div className="mt-4">
          <RecordingReviewSignoffResultCard result={lastResult} childId={childId} />
        </div>
      ) : lastResult ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-700">
          {lastResult.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          {lastResult.next_steps.map((step) => (
            <p key={step} className="mt-1 text-slate-600">
              {step}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
