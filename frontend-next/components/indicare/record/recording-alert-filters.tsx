'use client'

export type AlertFilterKey =
  | 'all'
  | 'urgent'
  | 'safeguarding'
  | 'privacy'
  | 'missing_rhi'
  | 'medication'
  | 'changes_requested'
  | 'resolved'

const FILTERS: { key: AlertFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'safeguarding', label: 'Safeguarding' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'missing_rhi', label: 'Missing/RHI' },
  { key: 'medication', label: 'Medication' },
  { key: 'changes_requested', label: 'Changes requested' },
  { key: 'resolved', label: 'Resolved' }
]

export function RecordingAlertFilters({
  active,
  onChange
}: {
  active: AlertFilterKey
  onChange: (key: AlertFilterKey) => void
}) {
  return (
    <div data-testid="recording-alert-filters" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          data-testid={`recording-alert-filter-${filter.key}`}
          onClick={() => onChange(filter.key)}
          className={`min-h-9 rounded-2xl px-3 py-1.5 text-xs font-black transition ${
            active === filter.key
              ? 'bg-slate-950 text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
