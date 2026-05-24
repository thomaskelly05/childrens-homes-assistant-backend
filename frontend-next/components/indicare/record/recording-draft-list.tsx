'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import {
  archiveRecordingDraft,
  deleteRecordingDraft,
  listRecordingDrafts,
  type RecordingDraftRecord
} from '@/lib/os-api/recording-drafts'
import { recordHubQueryString } from '@/lib/record/recording-hub'

function statusBadge(status: RecordingDraftRecord['status']) {
  if (status === 'ready_for_review') return 'Ready for review'
  if (status === 'submitted') return 'Submitted'
  if (status === 'archived') return 'Archived'
  return 'Draft'
}

function reviewBadge(draft: RecordingDraftRecord) {
  if (draft.review_status === 'changes_requested') return 'Changes requested'
  if (draft.review_status === 'approved') return 'Approved'
  if (draft.review_status === 'safeguarding_escalation_required') return 'Safeguarding escalation'
  if (draft.review_status === 'awaiting_review' || draft.status === 'ready_for_review') return 'Awaiting review'
  if (draft.safeguarding_review_required || draft.review_status === 'safeguarding_review_required') {
    return 'Safeguarding review'
  }
  if (draft.manager_review_required || draft.review_status === 'manager_review_required') {
    return 'Manager review required'
  }
  return null
}

export function RecordingDraftList({
  onResume,
  refreshKey = 0
}: {
  onResume?: (draft: RecordingDraftRecord) => void
  refreshKey?: number
}) {
  const [drafts, setDrafts] = useState<RecordingDraftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [message, setMessage] = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    const result = await listRecordingDrafts({ limit: 20 })
    setBackendAvailable(result.ok)
    setDrafts(result.ok ? result.data.items : [])
    if (!result.ok) {
      setMessage('Secure drafts are unavailable — local browser drafts may still be available in the editor.')
    } else {
      setMessage(undefined)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const handleArchive = async (draftId: string) => {
    await archiveRecordingDraft(draftId)
    await load()
  }

  const handleDelete = async (draftId: string) => {
    await deleteRecordingDraft(draftId)
    await load()
  }

  return (
    <section data-testid="recording-draft-list" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">My drafts</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Recent recording drafts</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            Secure drafts you can resume on any signed-in device. Local-only drafts stay in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Loading drafts…</p> : null}
      {message ? <p className="mt-4 text-sm font-semibold text-amber-800">{message}</p> : null}

      {!loading && drafts.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">
          {backendAvailable ? 'No secure drafts yet. Start writing in the workspace below.' : 'No secure drafts loaded.'}
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {drafts.map((draft) => {
          const review = reviewBadge(draft)
          const resumeHref = `/record${recordHubQueryString({
            about: (draft.context_type as 'child' | 'home-shift' | 'staff' | 'not-sure') || 'child',
            childId: draft.child_id != null ? String(draft.child_id) : undefined,
            childName: draft.child_name || undefined,
            type: draft.recording_type,
            draftId: draft.id
          })}`

          return (
            <li
              key={draft.id}
              data-testid={`recording-draft-item-${draft.id}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">{draft.title?.trim() || 'Untitled draft'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {draft.recording_type.replace(/-/g, ' ')}
                    {draft.child_name ? ` · ${draft.child_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-900">
                    {statusBadge(draft.status)}
                  </span>
                  {review ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950">
                      {review}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={resumeHref}
                  onClick={() => onResume?.(draft)}
                  className="inline-flex min-h-9 items-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                >
                  Resume
                </Link>
                <button
                  type="button"
                  onClick={() => void handleArchive(draft.id)}
                  className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(draft.id)}
                  className="inline-flex min-h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-900"
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
