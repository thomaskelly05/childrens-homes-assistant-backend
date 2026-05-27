'use client'

import type { NotificationPreferenceRule, OsNotificationSeverity } from '@/lib/os-api/notifications'

const SEVERITIES: OsNotificationSeverity[] = ['low', 'medium', 'high', 'urgent']

type Props = {
  rule: NotificationPreferenceRule
  onChange: (rule: NotificationPreferenceRule) => void
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    recording_alert: 'Recording alerts',
    isn: 'Safeguarding network (ISN)',
    manager_daily_brief: 'Manager daily brief',
    recording_review: 'Recording review',
    intelligence_action: 'Intelligence actions',
    governance: 'Governance',
    system: 'System'
  }
  return labels[source] || source.replaceAll('_', ' ')
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    recording: 'Recording',
    safeguarding_network: 'Safeguarding network',
    daily_brief: 'Daily brief',
    review: 'Review',
    action: 'Action',
    governance: 'Governance',
    handover: 'Handover',
    workforce: 'Workforce',
    system: 'System'
  }
  return labels[category] || category.replaceAll('_', ' ')
}

export function NotificationPreferenceRuleCard({ rule, onChange }: Props) {
  return (
    <article
      data-testid={`notification-preference-rule-${rule.category}`}
      className="rounded-[20px] border border-slate-100 bg-slate-50/80 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {sourceLabel(rule.source)} · {categoryLabel(rule.category)}
          </p>
          {rule.urgent_override ? (
            <span
              data-testid="notification-preference-urgent-override"
              className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-900"
            >
              Urgent safeguarding override
            </span>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
          <input
            type="checkbox"
            checked={rule.enabled}
            data-testid="notification-preference-enabled"
            onChange={(e) => onChange({ ...rule, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Minimum severity
          <select
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={rule.min_severity}
            onChange={(e) => onChange({ ...rule, min_severity: e.target.value as OsNotificationSeverity })}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={rule.in_app_enabled}
            onChange={(e) => onChange({ ...rule, in_app_enabled: e.target.checked })}
          />
          In-app enabled
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span data-testid="notification-preference-email-coming-later">
          Email: Coming later (disabled)
        </span>
        <span data-testid="notification-preference-push-coming-later">
          Push: Coming later (disabled)
        </span>
      </div>
    </article>
  )
}
