'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { RecordingReviewDetailPanel } from '@/components/indicare/record/recording-review-detail'
import {
  RecordingReviewPriorityBadge,
  RecordingReviewStatusBadge
} from '@/components/indicare/record/recording-review-status-badge'
import {
  getRecordingReviewDetail,
  getRecordingReviewSummary,
  listRecordingReviewQueue,
  MANAGER_JUDGEMENT_NOTICE,
  type RecordingReviewDetail,
  type RecordingReviewQueueItem,
  type RecordingReviewSummary
} from '@/lib/os-api/recording-reviews'

type FilterKey =
  | 'all'
  | 'manager'
  | 'changes_requested'
  | 'approved'
  | 'escalated'
  | 'overdue'

export function RecordingReviewQueue({
  childIdFilter,
  homeIdFilter
}: {
  childIdFilter?: number
  homeIdFilter?: number
}) {
  const [items, setItems] = useState<RecordingReviewQueueItem[]>([])
  const [summary, setSummary] = useState<RecordingReviewSummary | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RecordingReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    const params: Parameters<typeof listRecordingReviewQueue>[0] = {
      child_id: childIdFilter,
      home_id: homeIdFilter,
      limit: 100
    }
    if (filter === 'manager') params.manager_review_only = true
    if (filter === 'changes_requested') params.changes_requested_only = true
    if (filter === 'approved') params.approved_only = true
    if (filter === 'escalated') params.safeguarding_only = true
    if (filter === 'overdue') params.urgent_only = true

    const [queueResult, summaryResult] = await Promise.all([
      listRecordingReviewQueue(params),
      getRecordingReviewSummary()
    ])
    setItems(queueResult.ok ? queueResult.data.items : [])
    setSummary(summaryResult.ok ? summaryResult.data : null)
    setLoading(false)
  }, [filter, childIdFilter, homeIdFilter])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    void (async () => {
      const result = await getRecordingReviewDetail(selectedId)
      setDetail(result.ok ? result.data : null)
    })()
  }, [selectedId])

  const filters: { key: FilterKey; label: string; testId: string }[] = [
    { key: 'all', label: 'All', testId: 'recording-review-filter-all' },
    { key: 'manager', label: 'Awaiting manager review', testId: 'recording-review-filter-awaiting-manager' },
    { key: 'changes_requested', label: 'Returned for amendment', testId: 'recording-review-filter-returned' },
    { key: 'approved', label: 'Signed off', testId: 'recording-review-filter-signed-off' },
    { key: 'escalated', label: 'Escalated', testId: 'recording-review-filter-escalated' },
    { key: 'overdue', label: 'Overdue', testId: 'recording-review-filter-overdue' }
  ]

  return (
    <div data-testid="recording-review-queue" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-600" data-testid="recording-review-manager-judgement-queue">
          {MANAGER_JUDGEMENT_NOTICE}
        </p>
        <Link
          href={childIdFilter != null ? `/record/alerts?child_id=${childIdFilter}` : '/record/alerts'}
          data-testid="recording-review-alerts-link"
          className="inline-flex min-h-9 items-center rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-950"
        >
          Recording alerts
        </Link>

        {summary ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="recording-review-queue-status-summary">
            <SummaryCard
              label="Awaiting manager review"
              value={summary.awaiting_review}
              testId="recording-review-summary-awaiting-manager"
            />
            <SummaryCard
              label="Returned for amendment"
              value={summary.changes_requested}
              testId="recording-review-summary-returned"
            />
            <SummaryCard label="Signed off" value={summary.approved} testId="recording-review-summary-signed-off" />
            <SummaryCard
              label="Escalated"
              value={summary.safeguarding_review}
              testId="recording-review-summary-escalated"
            />
            <SummaryCard label="Overdue" value={summary.urgent} testId="recording-review-summary-overdue" />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              data-testid={item.testId}
              onClick={() => setFilter(item.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                filter === item.key ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm font-semibold text-slate-500">Loading review queue…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">No drafts awaiting review in this filter.</p>
        ) : null}

        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.draft_id}>
              <button
                type="button"
                data-testid={`recording-review-queue-item-${item.draft_id}`}
                onClick={() => setSelectedId(item.draft_id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === item.draft_id
                    ? 'border-blue-300 bg-blue-50/80 ring-1 ring-blue-200'
                    : 'border-slate-100 bg-white hover:border-blue-100'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-950">{item.title?.trim() || 'Untitled'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {item.recording_type.replace(/-/g, ' ')}
                      {item.child_name ? ` · ${item.child_name}` : ''}
                      {item.home_id != null ? ` · home ${item.home_id}` : ''}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      Event / updated {new Date(item.updated_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      Written by {item.created_by_name || 'Unknown'}
                      {item.created_by_role ? ` (${item.created_by_role})` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <RecordingReviewStatusBadge status={item.review_status} />
                    <RecordingReviewPriorityBadge priority={item.review_priority} />
                  </div>
                </div>
                {(item.manager_review_required || item.safeguarding_review_required) && (
                  <p
                    className="mt-2 text-[10px] font-black uppercase tracking-wide text-amber-800"
                    data-testid="recording-review-queue-reason"
                  >
                    {item.safeguarding_review_required ? 'Safeguarding review required' : 'Manager review required'}
                    {item.review_priority === 'high' || item.review_priority === 'urgent'
                      ? ` · ${item.review_priority} priority`
                      : ''}
                  </p>
                )}
                <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-blue-700">Open review →</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-w-0">
        {detail ? (
          <RecordingReviewDetailPanel
            detail={detail}
            onActionComplete={() => {
              void loadQueue()
              void getRecordingReviewDetail(selectedId!).then((r) => {
                if (r.ok) setDetail(r.data)
              })
            }}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm font-semibold text-slate-500">
            Select a draft to review details and take action.
          </p>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  testId
}: {
  label: string
  value: number
  testId: string
}) {
  return (
    <div data-testid={testId} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}
