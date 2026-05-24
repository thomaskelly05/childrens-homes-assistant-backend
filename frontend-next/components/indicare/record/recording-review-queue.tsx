'use client'

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
  | 'safeguarding'
  | 'manager'
  | 'changes_requested'
  | 'approved'
  | 'urgent'

export function RecordingReviewQueue({ childIdFilter }: { childIdFilter?: number }) {
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
      limit: 100
    }
    if (filter === 'safeguarding') params.safeguarding_only = true
    if (filter === 'manager') params.manager_review_only = true
    if (filter === 'changes_requested') params.changes_requested_only = true
    if (filter === 'approved') params.approved_only = true
    if (filter === 'urgent') params.urgent_only = true

    const [queueResult, summaryResult] = await Promise.all([
      listRecordingReviewQueue(params),
      getRecordingReviewSummary()
    ])
    setItems(queueResult.ok ? queueResult.data.items : [])
    setSummary(summaryResult.ok ? summaryResult.data : null)
    setLoading(false)
  }, [filter, childIdFilter])

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

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'safeguarding', label: 'Safeguarding review' },
    { key: 'manager', label: 'Manager review' },
    { key: 'changes_requested', label: 'Changes requested' },
    { key: 'approved', label: 'Approved' },
    { key: 'urgent', label: 'Urgent' }
  ]

  return (
    <div data-testid="recording-review-queue" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-600" data-testid="recording-review-manager-judgement-queue">
          {MANAGER_JUDGEMENT_NOTICE}
        </p>

        {summary ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <SummaryCard label="Awaiting review" value={summary.awaiting_review} testId="recording-review-summary-awaiting" />
            <SummaryCard
              label="Safeguarding review"
              value={summary.safeguarding_review}
              testId="recording-review-summary-safeguarding"
            />
            <SummaryCard
              label="Changes requested"
              value={summary.changes_requested}
              testId="recording-review-summary-changes"
            />
            <SummaryCard label="Approved" value={summary.approved} testId="recording-review-summary-approved" />
            <SummaryCard label="Urgent" value={summary.urgent} testId="recording-review-summary-urgent" />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
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
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      {item.created_by_name || 'Unknown'} · updated {new Date(item.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <RecordingReviewStatusBadge status={item.review_status} />
                    <RecordingReviewPriorityBadge priority={item.review_priority} />
                  </div>
                </div>
                {(item.manager_review_required || item.safeguarding_review_required) && (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-amber-800">
                    {item.safeguarding_review_required ? 'Safeguarding review' : 'Manager review'}
                  </p>
                )}
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
