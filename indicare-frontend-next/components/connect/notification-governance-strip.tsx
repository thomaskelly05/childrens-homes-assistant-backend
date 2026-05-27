'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getNotificationGovernanceSummary, type NotificationGovernanceSummary } from '@/lib/os-api/notifications'

function formatWhen(iso?: string | null) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function NotificationGovernanceStrip({ hiddenByPreferences = 0 }: { hiddenByPreferences?: number }) {
  const [summary, setSummary] = useState<NotificationGovernanceSummary | null>(null)

  useEffect(() => {
    void getNotificationGovernanceSummary().then((r) => setSummary(r.data))
  }, [])

  const m = summary?.response_metrics

  return (
    <div
      data-testid="notification-governance-strip"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-xs font-semibold text-slate-700"
    >
      <span className="font-black uppercase tracking-[0.1em] text-slate-500">Oversight</span>
      {m ? (
        <>
          <span data-testid="governance-urgent-unacknowledged">
            {m.urgent_unacknowledged} urgent unacknowledged
          </span>
          <span data-testid="governance-safeguarding-unacknowledged">
            {m.safeguarding_unacknowledged} safeguarding unacknowledged
          </span>
        </>
      ) : (
        <span>Metrics loading…</span>
      )}
      <span data-testid="governance-last-escalation-check">
        Last check: {formatWhen(summary?.last_escalation_check?.started_at)}
      </span>
      {hiddenByPreferences > 0 ? (
        <span data-testid="governance-hidden-by-preferences">{hiddenByPreferences} hidden by preferences</span>
      ) : null}
      {summary?.urgent_override_active ? (
        <span className="text-amber-800" data-testid="governance-urgent-override-active">
          Urgent override active
        </span>
      ) : null}
      <Link
        href="/notifications/settings"
        data-testid="governance-settings-link"
        className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-white"
      >
        Settings
      </Link>
    </div>
  )
}
