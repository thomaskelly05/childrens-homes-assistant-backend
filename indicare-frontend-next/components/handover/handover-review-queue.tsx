'use client'

import type { HandoverReviewQueueItem } from '@/lib/os-api/handover-intelligence'

import { HandoverReviewStatusBadge } from '@/components/handover/handover-status-badge'

type Props = {
  items: HandoverReviewQueueItem[]
  activeDraftId?: string
  onSelect: (draftId: string) => void
}

export function HandoverReviewQueue({ items, activeDraftId, onSelect }: Props) {
  if (!items.length) {
    return (
      <p className="text-sm font-semibold text-slate-500" data-testid="handover-review-queue-empty">
        No handovers awaiting review.
      </p>
    )
  }

  return (
    <ul data-testid="handover-review-queue" className="space-y-2">
      {items.map((item) => (
        <li key={item.draft_id}>
          <button
            type="button"
            onClick={() => onSelect(item.draft_id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              activeDraftId === item.draft_id
                ? 'border-blue-200 bg-blue-50/80'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-950">{item.title}</p>
              <HandoverReviewStatusBadge status={item.review_status} />
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              {item.shift_label || 'Shift'}
              {item.child_name ? ` · ${item.child_name}` : item.child_id ? ` · Child ${item.child_id}` : ' · Home'}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600" data-testid="handover-review-queue-safe-summary">
              {item.safe_summary}
            </p>
            {item.flags.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.flags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-700"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
