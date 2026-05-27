import type { AiPrivacyEventRecord } from '@/lib/os-api/ai-privacy'

export function PrivacyEventsTable({ events }: { events: AiPrivacyEventRecord[] }) {
  if (!events.length) {
    return (
      <p className="text-sm font-medium text-slate-600" data-testid="privacy-events-empty">
        No privacy events in this period.
      </p>
    )
  }

  return (
    <div
      className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white"
      data-testid="privacy-events-table"
    >
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Surface</th>
            <th className="px-4 py-3">Decision</th>
            <th className="px-4 py-3">Flags</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">
                {event.created_at ? new Date(event.created_at).toLocaleString('en-GB') : '—'}
              </td>
              <td className="px-4 py-3">{event.surface}</td>
              <td className="px-4 py-3 font-bold">{event.decision}</td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {event.redaction_applied ? 'Redaction' : ''}
                {event.minimisation_applied ? ' Minimisation' : ''}
                {event.manager_review_required ? ' Manager review' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
