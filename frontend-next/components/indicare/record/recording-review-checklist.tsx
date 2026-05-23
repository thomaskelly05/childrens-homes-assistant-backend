'use client'

import { useMemo } from 'react'

import { buildReviewChecklist, reviewChecklistOverall, type QualityCoachSeverity } from '@/lib/record/recording-quality-coach'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'

function itemStatusLabel(status: QualityCoachSeverity) {
  if (status === 'review') return 'Consider review'
  if (status === 'attention') return 'Needs attention'
  return 'Looks okay'
}

export function RecordingReviewChecklist({
  body,
  title = '',
  recordingType
}: {
  body: string
  title?: string
  recordingType?: RecordingWorkspaceType
}) {
  const items = useMemo(() => buildReviewChecklist(body, title, recordingType), [body, title, recordingType])
  const overall = useMemo(() => reviewChecklistOverall(items), [items])

  return (
    <section data-testid="recording-review-checklist" className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Review before saving</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">Overall: {itemStatusLabel(overall)}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
            <span>{item.label}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{itemStatusLabel(item.status)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
