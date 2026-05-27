'use client'

import type { NotificationEscalationRule } from '@/lib/os-api/notifications'

type Props = {
  rules: NotificationEscalationRule[]
}

function formatMinutes(minutes: number) {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} day(s)`
  if (minutes >= 60) return `${Math.round(minutes / 60)} hour(s)`
  return `${minutes} min`
}

export function NotificationEscalationRulesPanel({ rules }: Props) {
  return (
    <section data-testid="notification-escalation-rules-panel" className="space-y-3">
      <p className="text-xs leading-5 text-slate-500" data-testid="notification-escalation-safety-copy">
        Escalations support manager oversight. They do not make safeguarding decisions.
      </p>
      {rules.map((rule) => (
        <article
          key={rule.id}
          data-testid="notification-escalation-rule"
          className="rounded-[20px] border border-violet-100 bg-violet-50/40 p-4"
        >
          <h3 className="text-sm font-black text-slate-950">{rule.name}</h3>
          <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-black uppercase tracking-[0.08em] text-slate-400">Source / category</dt>
              <dd>
                {rule.source} · {rule.category}
              </dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-[0.08em] text-slate-400">Min severity</dt>
              <dd>{rule.min_severity}</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-[0.08em] text-slate-400">Trigger</dt>
              <dd>After {formatMinutes(rule.trigger_after_minutes)} unacknowledged</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-[0.08em] text-slate-400">Route to</dt>
              <dd>{rule.route_to_role?.replaceAll('_', ' ') || 'Manager (role unresolved)'}</dd>
            </div>
            <div>
              <dt className="font-black uppercase tracking-[0.08em] text-slate-400">Status</dt>
              <dd>{rule.status}</dd>
            </div>
          </dl>
        </article>
      ))}
      {!rules.length ? (
        <p className="text-sm text-slate-500">No escalation rules loaded.</p>
      ) : null}
    </section>
  )
}
