'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { StatusBadge } from '@/components/indicare/ui'
import { clientBulkCreateIntelligenceActions } from '@/lib/os-api/intelligence-actions-client'
import type { IntelligenceActionCreatePayload } from '@/lib/os-api/intelligence-actions-types'

type ProposedAction = {
  id?: string
  action_type?: string
  title: string
  summary?: string
  priority: string
  status?: string
  reason?: string
  suggested_next_step?: string
  regulatory_links?: string[]
  sccif_links?: string[]
  source_finding_id?: string
  source_finding_type?: string
  source_service?: string
  linked_record_ids?: string[]
}

function severityTone(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes('urgent') || lower.includes('high')) return 'overdue'
  if (lower.includes('medium')) return 'review'
  return 'available'
}

function toCreatePayload(action: ProposedAction, scope: { home_id?: string; child_id?: string }): IntelligenceActionCreatePayload {
  return {
    home_id: scope.home_id,
    child_id: scope.child_id,
    source_finding_id: action.source_finding_id || action.id,
    source_finding_type: action.source_finding_type,
    source_service: action.source_service || 'intelligence_spine',
    action_type: action.action_type || 'manager_signoff',
    title: action.title,
    summary: action.summary,
    priority: (action.priority as IntelligenceActionCreatePayload['priority']) || 'medium',
    reason: action.reason,
    suggested_next_step: action.suggested_next_step,
    regulatory_links: action.regulatory_links,
    sccif_links: action.sccif_links,
    linked_record_ids: action.linked_record_ids
  }
}

function hasPersistedId(id?: string) {
  return id && /^\d+$/.test(id)
}

export function IntelligenceSpineActionsPanel({
  proposedActions,
  homeId,
  childId,
  spinePayload
}: {
  proposedActions: ProposedAction[]
  homeId?: string
  childId?: string
  spinePayload?: Record<string, unknown>
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const persistedAny = proposedActions.some((a) => hasPersistedId(a.id))

  async function saveProposed() {
    if (!proposedActions.length) return
    if (!window.confirm('Save proposed actions for manager review? Nothing is accepted automatically.')) return
    setBusy(true)
    setError(null)
    setMessage(null)
    const payloads = proposedActions.map((a) => toCreatePayload(a, { home_id: homeId, child_id: childId }))
    const result = await clientBulkCreateIntelligenceActions({
      actions: payloads,
      home_id: homeId,
      child_id: childId
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Could not save proposed actions.')
      return
    }
    const created = result.data.created?.length ?? 0
    const failed = result.data.failed?.length ?? 0
    setMessage(
      `Saved ${created} proposed action(s) for manager review.${failed ? ` ${failed} skipped (duplicate or error).` : ''}`
    )
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/intelligence-actions${homeId ? `?home_id=${encodeURIComponent(homeId)}` : ''}${childId ? `${homeId ? '&' : '?'}child_id=${encodeURIComponent(childId)}` : ''}`}
          className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
        >
          Open Action Board
        </Link>
        <Link
          href="/intelligence-oversight"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
        >
          Record oversight review
        </Link>
        {proposedActions.length ? (
          <button
            type="button"
            disabled={busy}
            onClick={saveProposed}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save proposed actions for manager review'}
          </button>
        ) : null}
      </div>
      {!persistedAny && proposedActions.length ? (
        <p className="text-xs font-bold text-amber-800">
          Save proposed actions before manager decisions can be recorded on the audit trail.
        </p>
      ) : null}
      {message ? <p className="text-xs font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      <ul className="space-y-3">
        {proposedActions.map((action) => (
          <li
            key={action.id || action.title}
            className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={severityTone(action.priority)} />
              {action.action_type ? (
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {action.action_type.replaceAll('_', ' ')}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-black text-slate-800">{action.title}</p>
            {action.summary ? <p className="mt-1 text-sm text-slate-600">{action.summary}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {hasPersistedId(action.id) ? (
                <Link
                  href={`/intelligence-actions?action_id=${encodeURIComponent(action.id!)}`}
                  className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-800"
                >
                  Review action
                </Link>
              ) : (
                <span className="rounded-xl border border-dashed border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">
                  Save to enable Accept in Action Board
                </span>
              )}
              <Link
                href="/intelligence-actions"
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-black text-slate-600"
              >
                Accept in Action Board
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {spinePayload ? (
        <p className="text-[10px] text-slate-400">Spine snapshot available for propose API if bulk save is retried.</p>
      ) : null}
    </div>
  )
}
