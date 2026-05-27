'use client'

import { useState } from 'react'
import Link from 'next/link'

import { applyHandoverReviewAction, handoverOrbHref } from '@/lib/os-api/handover-intelligence'

type Props = {
  draftId: string
  reviewStatus: string
  onAction: () => void
}

export function HandoverReviewActions({ draftId, reviewStatus, onAction }: Props) {
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState('')
  const [message, setMessage] = useState('')

  const run = async (
    action: 'approve' | 'request_changes' | 'mark_safeguarding_review_required' | 'complete_after_approval'
  ) => {
    setBusy(true)
    setMessage('')
    const result = await applyHandoverReviewAction(draftId, action, comments || undefined)
    setBusy(false)
    if (result.ok) {
      setMessage(result.data.warnings?.[0] || 'Action recorded.')
      onAction()
    } else {
      setMessage('Action could not be completed.')
    }
  }

  return (
    <section data-testid="handover-review-actions" className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Review comments</span>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          placeholder="Optional manager notes — no raw safeguarding narrative required."
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run('approve')}
          data-testid="handover-review-approve"
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run('request_changes')}
          data-testid="handover-review-request-changes"
          className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900"
        >
          Request changes
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run('mark_safeguarding_review_required')}
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-900"
        >
          Mark safeguarding review required
        </button>
        {reviewStatus === 'approved' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('complete_after_approval')}
            data-testid="handover-review-complete-after-approval"
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
          >
            Complete after approval
          </button>
        ) : null}
        <Link
          href={`/handover?draft_id=${draftId}`}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800"
        >
          Open handover draft
        </Link>
        <Link href="/command-centre" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800">
          Open Care Hub
        </Link>
        <Link
          href={handoverOrbHref('manager_daily_brief', 'Help me review this handover for clarity.')}
          data-testid="handover-review-ask-orb"
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
        >
          Ask OS ORB
        </Link>
      </div>
      {message ? <p className="text-xs font-semibold text-slate-600">{message}</p> : null}
    </section>
  )
}
