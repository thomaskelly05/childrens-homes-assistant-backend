'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  filterAdminAuditLog,
  isAdminAuditMemoryFallback,
  listAdminAuditLog,
  type AdminAuditFilter,
  type AdminAuditLogEntry
} from '@/lib/admin-command-centre/audit/admin-audit-log'
import { isAdminDevelopmentMode } from '@/lib/admin-command-centre/admin-data-mode'

import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'
import { AdminTableShell, formatAdminDate } from './admin-action-button'

const FILTERS: { id: AdminAuditFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'user-actions', label: 'User actions' },
  { id: 'provider-actions', label: 'Provider actions' },
  { id: 'access-changes', label: 'Access changes' },
  { id: 'security-actions', label: 'Security actions' },
  { id: 'failed-actions', label: 'Failed actions' }
]

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([])
  const [filter, setFilter] = useState<AdminAuditFilter>('all')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const items = await listAdminAuditLog()
    setEntries(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = filterAdminAuditLog(entries, filter)
  const usingMemoryFallback = isAdminAuditMemoryFallback()

  return (
    <AdminSectionCard
      eyebrow="Audit log"
      title="Admin audit trail"
      description={
        usingMemoryFallback
          ? 'Development mode — includes placeholder audit entries. Live admin mutations also append to in-memory fallback when persistence is unavailable.'
          : 'Live admin audit events from platform admin APIs, plus client-side action telemetry.'
      }
    >
      {isAdminDevelopmentMode() && usingMemoryFallback ? (
        <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-100/90">
          Placeholder audit events are shown in development/demo mode only.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
              filter === item.id
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-100'
                : 'border-white/10 bg-white/[0.03] text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading audit log…</p>
      ) : (
        <AdminTableShell
          headers={[
            'Actor',
            'Action',
            'Target type',
            'Target',
            'Timestamp',
            'Risk',
            'Reason',
            'Status'
          ]}
          emptyMessage="No audit events match this filter."
        >
          {filtered.map((entry) => (
            <tr key={entry.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-3 font-semibold text-white">
                {entry.actorEmail || entry.actorId || 'system'}
              </td>
              <td className="px-4 py-3 text-slate-300">{entry.action}</td>
              <td className="px-4 py-3 text-slate-500">{entry.targetType}</td>
              <td className="px-4 py-3 text-slate-400">{entry.targetLabel}</td>
              <td className="px-4 py-3 text-slate-500">{formatAdminDate(entry.timestamp)}</td>
              <td className="px-4 py-3">
                <AdminStatusBadge status={entry.riskLevel} />
              </td>
              <td className="px-4 py-3 text-slate-500">{entry.reason || '—'}</td>
              <td className="px-4 py-3">
                <AdminStatusBadge status={entry.status} />
              </td>
            </tr>
          ))}
        </AdminTableShell>
      )}
    </AdminSectionCard>
  )
}
