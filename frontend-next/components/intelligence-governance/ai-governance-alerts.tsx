import type { AiGovernanceAlert } from '@/lib/os-api/ai-governance'

const levelStyles: Record<string, string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
  high: 'border-amber-200 bg-amber-50 text-amber-950',
  medium: 'border-blue-200 bg-blue-50 text-blue-950',
  low: 'border-slate-200 bg-slate-50 text-slate-800',
  info: 'border-slate-200 bg-white text-slate-700'
}

export function AiGovernanceAlerts({ alerts }: { alerts: AiGovernanceAlert[] }) {
  if (!alerts.length) {
    return (
      <p className="text-sm font-medium text-slate-600" data-testid="ai-governance-alerts-empty">
        No active governance alerts for this period.
      </p>
    )
  }

  return (
    <ul className="space-y-3" data-testid="ai-governance-alerts">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className={`rounded-2xl border px-4 py-3 ${levelStyles[alert.level] || levelStyles.info}`}
        >
          <p className="text-sm font-black">{alert.title}</p>
          <p className="mt-1 text-sm font-medium">{alert.message}</p>
        </li>
      ))}
    </ul>
  )
}
