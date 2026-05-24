'use client'

import Link from 'next/link'

import type { RecordingGovernanceAlert } from '@/lib/os-api/recording-governance'

const RISK_TONE: Record<string, string> = {
  urgent: 'border-rose-200 bg-rose-50',
  high: 'border-amber-200 bg-amber-50',
  medium: 'border-blue-100 bg-blue-50/70',
  low: 'border-slate-100 bg-slate-50'
}

export function RecordingGovernanceAlerts({
  alerts,
  recommendations
}: {
  alerts: RecordingGovernanceAlert[]
  recommendations: string[]
}) {
  return (
    <section data-testid="recording-governance-alerts" className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-950">Alerts and recommendations</h2>
        <p className="text-sm font-semibold text-slate-600">Decision-support only — manager judgement remains required.</p>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`rounded-2xl border px-4 py-3 ${RISK_TONE[alert.risk_level] || RISK_TONE.medium}`}
          >
            <p className="text-sm font-black text-slate-950">{alert.title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{alert.description}</p>
            {alert.route && alert.action_label ? (
              <Link
                href={alert.route}
                className="mt-2 inline-flex text-xs font-black text-blue-700 underline"
              >
                {alert.action_label}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {recommendations.length ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Recommendations</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
            {recommendations.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
