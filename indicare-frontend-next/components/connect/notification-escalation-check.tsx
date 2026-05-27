'use client'

import { useEffect, useState } from 'react'

import {
  getLastNotificationEscalationRun,
  runNotificationEscalationCheck,
  type NotificationEscalationCheckResult,
  type NotificationEscalationRunRecord
} from '@/lib/os-api/notifications'

function formatWhen(iso?: string | null) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function NotificationEscalationCheck() {
  const [dryRun, setDryRun] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<NotificationEscalationCheckResult | null>(null)
  const [lastRun, setLastRun] = useState<NotificationEscalationRunRecord | null>(null)

  useEffect(() => {
    void getLastNotificationEscalationRun().then((r) => setLastRun(r.data))
  }, [])

  async function runCheck() {
    setBusy(true)
    try {
      const response = await runNotificationEscalationCheck({ dry_run: dryRun })
      setResult(response.data)
      const last = await getLastNotificationEscalationRun()
      setLastRun(last.data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section data-testid="notification-escalation-check" className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">Run escalation check</h2>
      <p className="mt-1 text-sm text-slate-600">
        Scan operational notifications for overdue acknowledgement. Dry run does not create escalation records.
      </p>
      <p className="mt-2 text-xs font-semibold text-slate-500" data-testid="notification-escalation-last-check">
        Last escalation check: {formatWhen(lastRun?.started_at)}
        {lastRun ? ` · ${lastRun.candidate_count} candidates` : ''}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
          <input
            type="checkbox"
            checked={dryRun}
            data-testid="notification-escalation-dry-run"
            onChange={(e) => setDryRun(e.target.checked)}
          />
          Dry run
        </label>
        <button
          type="button"
          data-testid="notification-escalation-run-check"
          disabled={busy}
          onClick={() => void runCheck()}
          className="rounded-full bg-violet-600 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run escalation check'}
        </button>
      </div>

      {result ? (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-slate-500">
            {result.candidates.length} candidate(s) · dry run: {result.dry_run ? 'yes' : 'no'}
          </p>
          {result.recommendations.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700" data-testid="notification-escalation-recommendations">
              {result.recommendations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {result.candidates.length ? (
            <div className="space-y-2" data-testid="notification-escalation-candidates">
              {result.candidates.map((c) => (
                <article key={`${c.notification_key}-${c.escalation_rule_id}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="font-black text-slate-900">{c.title}</p>
                  <p className="mt-1 text-slate-600">{c.safe_summary}</p>
                  <p className="mt-2 text-[10px] font-black uppercase text-slate-400">
                    {c.age_minutes} min · route: {c.route_to_role || 'unresolved'} · {c.current_status}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
          {result.warnings.length ? (
            <ul className="text-xs text-amber-800">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
