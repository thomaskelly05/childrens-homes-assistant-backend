'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  getLastNotificationEscalationRun,
  getNotificationResponseMetrics,
  type NotificationEscalationRunRecord,
  type NotificationResponseMetric
} from '@/lib/os-api/notifications'
import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'

function formatWhen(iso?: string | null) {
  if (!iso) return 'No check yet'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function CareHubNotificationOversight() {
  const [metrics, setMetrics] = useState<NotificationResponseMetric | null>(null)
  const [lastRun, setLastRun] = useState<NotificationEscalationRunRecord | null>(null)
  const [degraded, setDegraded] = useState(false)

  useEffect(() => {
    void Promise.all([getNotificationResponseMetrics(), getLastNotificationEscalationRun()]).then(
      ([met, last]) => {
        setDegraded(!met.ok || !last.ok)
        setMetrics(met.data)
        setLastRun(last.data)
      }
    )
  }, [])

  return (
    <section
      data-testid="care-hub-notification-oversight"
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Notification oversight</p>
      {degraded && !metrics ? (
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Notification oversight summary temporarily unavailable.
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
          <p>
            <span className="font-black text-rose-700">{metrics?.urgent_unacknowledged ?? '—'}</span> urgent
            unacknowledged
          </p>
          <p>
            <span className="font-black text-amber-800">{metrics?.safeguarding_unacknowledged ?? '—'}</span>{' '}
            safeguarding unacknowledged
          </p>
          <p className="text-xs text-slate-500">Last escalation check: {formatWhen(lastRun?.started_at)}</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/notifications/settings"
          className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50"
        >
          Notification settings
        </Link>
        <Link
          href="/notifications/settings#escalation"
          data-testid="care-hub-run-escalation-check"
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-violet-800"
        >
          Run escalation check
        </Link>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <OrbInlineHint
          label="Ask ORB to help prioritise unresolved notifications"
          href="/assistant/orb?mode=action_priority"
          tone="cyan"
        />
      </div>
    </section>
  )
}
