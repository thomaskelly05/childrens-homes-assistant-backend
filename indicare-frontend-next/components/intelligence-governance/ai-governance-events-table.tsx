import type { AiGovernanceEventRecord } from '@/lib/os-api/ai-governance'

function formatWhen(value: string) {
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return value
  }
}

export function AiGovernanceEventsTable({ events }: { events: AiGovernanceEventRecord[] }) {
  if (!events.length) {
    return (
      <p className="text-sm font-medium text-slate-600" data-testid="ai-governance-events-empty">
        No governance events recorded in this period yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white" data-testid="ai-governance-events-table">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Surface</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Risk</th>
            <th className="px-4 py-3">Model route</th>
            <th className="px-4 py-3">Quality</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-700">{formatWhen(event.created_at)}</td>
              <td className="px-4 py-3 font-bold text-slate-900">{event.surface}</td>
              <td className="px-4 py-3 text-slate-700">{event.event_type}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black uppercase">{event.risk_level}</span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {[event.model_provider, event.model_name].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {event.evaluation_score != null ? event.evaluation_score.toFixed(2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
