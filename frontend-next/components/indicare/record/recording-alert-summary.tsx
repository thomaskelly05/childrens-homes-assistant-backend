'use client'

import type { RecordingAlertSummary } from '@/lib/os-api/recording-alerts'

export function RecordingAlertSummaryCards({ summary }: { summary: RecordingAlertSummary }) {
  const cards = [
    { id: 'open', label: 'Open', value: summary.open_count, tone: 'border-slate-200 bg-slate-50' },
    { id: 'urgent', label: 'Urgent', value: summary.urgent_count, tone: 'border-rose-200 bg-rose-50' },
    {
      id: 'safeguarding',
      label: 'Safeguarding',
      value: summary.safeguarding_count,
      tone: 'border-amber-200 bg-amber-50'
    },
    { id: 'privacy', label: 'Privacy flags', value: summary.privacy_count, tone: 'border-blue-100 bg-blue-50' },
    {
      id: 'changes',
      label: 'Changes requested',
      value: summary.changes_requested_count,
      tone: 'border-purple-100 bg-purple-50'
    },
    {
      id: 'overdue',
      label: 'Overdue/stale',
      value: summary.overdue_count + summary.stale_count,
      tone: 'border-slate-200 bg-white'
    }
  ]

  return (
    <div data-testid="recording-alert-summary-cards" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.id}
          data-testid={`recording-alert-summary-${card.id}`}
          className={`rounded-2xl border px-4 py-3 ${card.tone}`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{card.value}</p>
        </article>
      ))}
    </div>
  )
}
