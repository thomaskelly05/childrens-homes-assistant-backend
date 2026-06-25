'use client'

import { buildLiveUsageMetrics } from '@/lib/admin-command-centre/admin-metrics'

import { AdminSectionCard } from './admin-section-card'
import { AdminTableShell, formatAdminDate } from './admin-action-button'

const STATION_LABELS: Record<string, string> = {
  chat: 'Chat',
  write: 'Write',
  dictate: 'Dictate',
  voice: 'Voice',
  communicate: 'Communicate'
}

export function LiveUsagePanel() {
  const usage = buildLiveUsageMetrics()

  return (
    <AdminSectionCard
      eyebrow="Live usage"
      title="Usage monitoring"
      description="Metadata-only usage signals — station activity, request counts and session events. No care record content is shown."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Active today</p>
          <p className="mt-2 text-3xl font-black text-white">{usage.activeUsersToday}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Active this week</p>
          <p className="mt-2 text-3xl font-black text-white">{usage.activeUsersThisWeek}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Total requests</p>
          <p className="mt-2 text-3xl font-black text-white">{usage.totalRequests}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Failed requests</p>
          <p className="mt-2 text-3xl font-black text-rose-300">{usage.failedRequests}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-slate-300">Station usage</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.entries(usage.stationUsage).map(([station, count]) => (
            <div key={station} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {STATION_LABELS[station] ?? station}
              </p>
              <p className="mt-1 text-xl font-black text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {usage.averageResponseTimeMs === null ? (
        <p className="mb-4 text-xs text-slate-500">
          Average response time: placeholder — not available in development mode.
        </p>
      ) : null}

      <h3 className="mb-3 text-sm font-bold text-slate-300">Latest activity (metadata only)</h3>
      <AdminTableShell headers={['User', 'Station', 'Action', 'Timestamp']}>
        {usage.latestActivity.map((activity) => (
          <tr key={activity.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 text-white">{activity.user}</td>
            <td className="px-4 py-3 text-slate-400">{STATION_LABELS[activity.station] ?? activity.station}</td>
            <td className="px-4 py-3 text-slate-400">{activity.action}</td>
            <td className="px-4 py-3 text-slate-500">{formatAdminDate(activity.timestamp)}</td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
