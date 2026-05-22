'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { IntelligenceActionCard } from '@/components/indicare/intelligence/intelligence-action-card'
import { Card, SectionHeader, StatCard } from '@/components/indicare/ui'
import type { IntelligenceActionRecord, IntelligenceActionSummary } from '@/lib/os-api/intelligence-actions-types'

const DECISION_NOTICE =
  'IndiCare suggests proposed actions for manager review. Human decision required — decision support only, not a safeguarding or inspection decision.'

type Filters = {
  status: string
  priority: string
  action_type: string
  home_id: string
  child_id: string
}

export function IntelligenceActionBoardClient({
  initialActions,
  initialSummary,
  actionNotice,
  persistenceAvailable,
  defaultFilters
}: {
  initialActions: IntelligenceActionRecord[]
  initialSummary: IntelligenceActionSummary
  actionNotice?: string
  persistenceAvailable: boolean
  defaultFilters: Filters
}) {
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const filtered = useMemo(() => {
    return initialActions.filter((action) => {
      if (filters.status && action.status !== filters.status) return false
      if (filters.priority && action.priority !== filters.priority) return false
      if (filters.action_type && action.action_type !== filters.action_type) return false
      if (filters.home_id && action.home_id !== filters.home_id) return false
      if (filters.child_id && action.child_id !== filters.child_id) return false
      return true
    })
  }, [initialActions, filters])

  const sections = useMemo(
    () => ({
      urgent: filtered.filter((a) => a.priority === 'urgent' && !['completed', 'dismissed'].includes(a.status)),
      proposed: filtered.filter((a) => a.status === 'proposed'),
      inProgress: filtered.filter((a) => a.status === 'in_progress' || a.status === 'accepted'),
      closed: filtered.filter((a) => ['completed', 'dismissed', 'superseded'].includes(a.status))
    }),
    [filtered]
  )

  function applyFilters() {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.action_type) params.set('action_type', filters.action_type)
    if (filters.home_id) params.set('home_id', filters.home_id)
    if (filters.child_id) params.set('child_id', filters.child_id)
    router.push(`/intelligence-actions?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <Card className="border border-amber-100 bg-amber-50/60">
        <p className="text-sm font-bold leading-7 text-amber-900">{DECISION_NOTICE}</p>
        <p className="mt-2 text-sm text-amber-800/90">
          {actionNotice || 'Actions are proposed for manager review and are not automatically accepted.'}
        </p>
        {!persistenceAvailable ? (
          <p className="mt-2 text-xs font-bold text-amber-900">
            Database persistence may be unavailable — actions are held in memory until migration 072 is applied.
          </p>
        ) : null}
      </Card>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Urgent" value={initialSummary.urgent_count ?? 0} detail="Needs review" />
        <StatCard label="High" value={initialSummary.by_priority?.high ?? 0} detail="Source review recommended" />
        <StatCard label="Proposed" value={initialSummary.proposed_count ?? 0} detail="Awaiting manager decision" />
        <StatCard label="In progress" value={initialSummary.by_status?.in_progress ?? 0} detail="Manager follow-up" />
        <StatCard label="Completed" value={initialSummary.by_status?.completed ?? 0} detail="After source review" />
        <StatCard label="Dismissed" value={initialSummary.by_status?.dismissed ?? 0} detail="Recorded with reason" />
      </section>

      <Card>
        <SectionHeader eyebrow="Filters" title="Scope and status" description="Filter proposed actions for manager decision." />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {(
            [
              ['status', 'Status', ['', 'proposed', 'accepted', 'in_progress', 'completed', 'dismissed']],
              ['priority', 'Priority', ['', 'urgent', 'high', 'medium', 'low']],
              ['action_type', 'Action type', ['', ...new Set(initialActions.map((a) => a.action_type))]],
              ['home_id', 'Home ID', null],
              ['child_id', 'Child ID', null]
            ] as const
          ).map(([key, label, options]) =>
            options ? (
              <label key={key} className="block text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                  value={filters[key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                >
                  {options.map((opt) => (
                    <option key={opt || 'all'} value={opt}>
                      {opt || 'All'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label key={key} className="block text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={filters[key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            )
          )}
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="mt-4 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white"
        >
          Apply filters
        </button>
      </Card>

      {[
        ['Urgent review', sections.urgent],
        ['Proposed actions', sections.proposed],
        ['In progress', sections.inProgress],
        ['Completed / dismissed', sections.closed]
      ].map(([title, items]) => (
        <Card key={title as string}>
          <SectionHeader eyebrow="Board" title={title as string} />
          <ul className="space-y-3">
            {(items as IntelligenceActionRecord[]).length ? (
              (items as IntelligenceActionRecord[]).map((action) => (
                <li key={action.id}>
                  <IntelligenceActionCard action={action} />
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No actions in this section for the current filters.</li>
            )}
          </ul>
        </Card>
      ))}
    </div>
  )
}
