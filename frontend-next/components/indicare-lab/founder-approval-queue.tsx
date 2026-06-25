'use client'

import { Check, FileQuestion, Send, X } from 'lucide-react'
import { useState } from 'react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import { LAB_MODE_LABELS } from '@/lib/indicare-lab/demo-data'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import type { ApprovalQueueItem, ApprovalStatus } from '@/lib/indicare-lab/types'

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: LAB_MODE_LABELS.awaitingApproval,
  approved: 'Approved',
  rejected: 'Rejected',
  'needs-evidence': 'Needs more evidence',
  'expert-review': 'Sent to expert review'
}

const STATUS_TONE: Record<ApprovalStatus, string> = {
  pending: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  approved: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  rejected: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  'needs-evidence': 'text-violet-300 border-violet-400/30 bg-violet-500/10',
  'expert-review': 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10'
}

export function FounderApprovalQueue({ initialItems }: { initialItems: ApprovalQueueItem[] }) {
  const [items, setItems] = useState(initialItems)

  function updateStatus(id: string, status: ApprovalStatus) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  return (
    <LabSectionCard
      id="approvals"
      eyebrow="Governance"
      title="Founder approval queue"
      description="High-risk changes do not deploy silently. Review evidence and take explicit approval actions."
    >
      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            data-testid={`approval-item-${item.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.type}</p>
                <h3 className="mt-1 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">Submitted {formatLabDate(item.submittedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <RiskBadge level={item.riskLevel} />
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_TONE[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">{item.summary}</p>
            {item.evidence.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {item.evidence.map((ev) => (
                  <li key={ev} className="flex gap-2">
                    <span className="text-cyan-400/60">·</span>
                    {ev}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateStatus(item.id, 'approved')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Approve
              </button>
              <button
                type="button"
                onClick={() => updateStatus(item.id, 'rejected')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Reject
              </button>
              <button
                type="button"
                onClick={() => updateStatus(item.id, 'needs-evidence')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20"
              >
                <FileQuestion className="h-3.5 w-3.5" aria-hidden />
                Needs more evidence
              </button>
              <button
                type="button"
                onClick={() => updateStatus(item.id, 'expert-review')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
                Send to expert review
              </button>
            </div>
          </article>
        ))}
      </div>
    </LabSectionCard>
  )
}
