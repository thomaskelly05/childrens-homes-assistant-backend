'use client'

import { useEffect, useState } from 'react'

import {
  listNotificationEscalationRuns,
  type NotificationEscalationRunRecord
} from '@/lib/os-api/notifications'

function formatWhen(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function NotificationEscalationRunHistory() {
  const [runs, setRuns] = useState<NotificationEscalationRunRecord[]>([])
  const [selected, setSelected] = useState<NotificationEscalationRunRecord | null>(null)

  useEffect(() => {
    void listNotificationEscalationRuns({ limit: 10 }).then((r) => setRuns(r.data))
  }, [])

  return (
    <section data-testid="notification-escalation-run-history" className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">Escalation check history</h2>
      <p className="mt-1 text-sm text-slate-600">Recent manual checks — metadata counts only, no record bodies.</p>
      {!runs.length ? (
        <p className="mt-4 text-sm text-slate-500">No escalation checks recorded yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {runs.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                data-testid="notification-escalation-run-row"
                onClick={() => setSelected(selected?.id === run.id ? null : run)}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-100"
              >
                <span className="font-black text-slate-900">{formatWhen(run.started_at)}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {run.candidate_count} candidates · dry run: {run.dry_run ? 'yes' : 'no'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4 text-sm" data-testid="notification-escalation-run-details">
          <p className="font-black text-slate-900">Run details</p>
          <p className="mt-2 text-slate-600">
            Urgent: {selected.urgent_count} · Safeguarding: {selected.safeguarding_count} · Recording:{' '}
            {selected.recording_count} · ISN: {selected.isn_count} · Brief: {selected.daily_brief_count}
          </p>
          <p className="mt-1 text-slate-600">Events created: {selected.event_count}</p>
          {selected.recommendations?.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
              {selected.recommendations.slice(0, 3).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
