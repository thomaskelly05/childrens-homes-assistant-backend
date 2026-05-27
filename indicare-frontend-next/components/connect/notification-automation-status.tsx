'use client'

import { useEffect, useState } from 'react'

import {
  getLastNotificationEscalationRun,
  getNotificationAutomationHealth,
  getNotificationResponseMetrics,
  type NotificationAutomationHealth,
  type NotificationEscalationRunRecord,
  type NotificationResponseMetric
} from '@/lib/os-api/notifications'

function formatWhen(iso?: string | null) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function NotificationAutomationStatus() {
  const [automation, setAutomation] = useState<NotificationAutomationHealth | null>(null)
  const [metrics, setMetrics] = useState<NotificationResponseMetric | null>(null)
  const [lastRun, setLastRun] = useState<NotificationEscalationRunRecord | null>(null)

  useEffect(() => {
    void Promise.all([
      getNotificationAutomationHealth(),
      getNotificationResponseMetrics(),
      getLastNotificationEscalationRun()
    ]).then(([auto, met, last]) => {
      setAutomation(auto.data)
      setMetrics(met.data)
      setLastRun(last.data)
    })
  }, [])

  return (
    <section
      data-testid="notification-automation-status"
      className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5"
    >
      <h2 className="text-lg font-black text-slate-950">Automation status</h2>
      <p className="mt-1 text-sm text-slate-600">
        This is the in-app notification foundation. Push and email will be configured later.
      </p>
      <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
        <li data-testid="notification-automation-manual">
          Manual escalation checks: {automation?.manual_checks_available ? 'available' : 'unavailable'}
        </li>
        <li data-testid="notification-automation-scheduler">
          Scheduler not configured yet
        </li>
        <li data-testid="notification-automation-push">Push not configured yet</li>
        <li data-testid="notification-automation-email">Email not configured yet</li>
        <li data-testid="notification-last-escalation-check">
          Last escalation check: {formatWhen(lastRun?.started_at || automation?.last_check_at)}
        </li>
      </ul>
      {metrics ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="notification-response-metrics-summary">
          <p className="text-sm">
            <span className="font-black text-rose-700" data-testid="notification-urgent-unacknowledged">
              {metrics.urgent_unacknowledged}
            </span>{' '}
            urgent unacknowledged
          </p>
          <p className="text-sm">
            <span className="font-black text-amber-800" data-testid="notification-safeguarding-unacknowledged">
              {metrics.safeguarding_unacknowledged}
            </span>{' '}
            safeguarding unacknowledged
          </p>
          {metrics.average_minutes_to_acknowledge != null ? (
            <p className="text-sm sm:col-span-2" data-testid="notification-average-ack-time">
              Average acknowledgement time: {metrics.average_minutes_to_acknowledge} minutes
            </p>
          ) : null}
        </div>
      ) : null}
      {automation?.warnings?.length ? (
        <ul className="mt-3 list-disc pl-5 text-xs text-slate-500">
          {automation.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
