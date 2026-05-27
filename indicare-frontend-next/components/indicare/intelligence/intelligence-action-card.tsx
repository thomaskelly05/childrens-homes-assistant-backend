'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { StatusBadge } from '@/components/indicare/ui'
import {
  clientCompleteIntelligenceAction,
  clientDecideIntelligenceAction
} from '@/lib/os-api/intelligence-actions-client'
import type { IntelligenceActionRecord } from '@/lib/os-api/intelligence-actions-types'

const DECISION_NOTICE =
  'Decision support only. IndiCare suggests; the manager decides. This does not complete work automatically or make safeguarding decisions.'

function priorityTone(priority: string) {
  if (priority === 'urgent') return 'overdue'
  if (priority === 'high') return 'review'
  return 'available'
}

export function IntelligenceActionCard({
  action,
  onUpdated
}: {
  action: IntelligenceActionRecord
  onUpdated?: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [completeNotes, setCompleteNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const terminal = action.status === 'completed' || action.status === 'dismissed' || action.status === 'superseded'

  async function runDecision(decision: 'accept' | 'dismiss' | 'in_progress' | 'complete', confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return
    setBusy(decision)
    setError(null)
    setMessage(null)
    const result =
      decision === 'complete'
        ? await clientCompleteIntelligenceAction(action.id, completeNotes || reason || undefined)
        : await clientDecideIntelligenceAction(action.id, {
            decision,
            reason: reason || undefined,
            manager_notes: reason || undefined
          })
    setBusy(null)
    if (!result.ok) {
      setError(result.error || 'Could not record manager decision.')
      return
    }
    setMessage('Manager decision recorded in the audit trail.')
    onUpdated?.()
    router.refresh()
  }

  return (
    <article className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={priorityTone(action.priority)} />
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
          {action.action_type.replaceAll('_', ' ')}
        </span>
        <span className="text-xs font-bold text-slate-500">{action.status}</span>
      </div>
      <p className="mt-2 text-sm font-black text-slate-800">{action.title}</p>
      {action.summary ? <p className="mt-1 text-sm text-slate-600">{action.summary}</p> : null}
      {action.reason ? <p className="mt-2 text-xs font-bold text-amber-800">Reason: {action.reason}</p> : null}
      {action.suggested_next_step ? (
        <p className="mt-1 text-xs font-bold text-blue-800">Suggested next step: {action.suggested_next_step}</p>
      ) : null}
      {(action.linked_record_ids?.length || action.regulatory_links?.length || action.sccif_links?.length) ? (
        <p className="mt-2 text-xs text-slate-500">
          {action.linked_record_ids?.length ? `Linked records: ${action.linked_record_ids.join(', ')} · ` : ''}
          {[...(action.regulatory_links || []), ...(action.sccif_links || [])].join(' · ')}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] font-bold text-slate-400">
        Owner: {action.owner_role || 'registered_manager'}
        {action.created_at ? ` · ${new Date(action.created_at).toLocaleString('en-GB')}` : ''}
      </p>
      <p className="mt-2 text-[10px] leading-5 text-slate-500">{DECISION_NOTICE}</p>

      {!terminal ? (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Manager notes or reason (recommended for dismiss)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          {action.status === 'in_progress' || action.status === 'accepted' ? (
            <input
              type="text"
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Completion notes after source review"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {action.status === 'proposed' ? (
              <>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    runDecision('accept', 'Accept this proposed action for manager follow-up?')
                  }
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() =>
                    runDecision('dismiss', 'Dismiss this proposed action? Add a reason where possible.')
                  }
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 disabled:opacity-50"
                >
                  Dismiss
                </button>
              </>
            ) : null}
            {action.status === 'proposed' || action.status === 'accepted' ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => runDecision('in_progress', 'Mark this action in progress for manager follow-up?')}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
              >
                Mark in progress
              </button>
            ) : null}
            {action.status !== 'completed' && action.status !== 'dismissed' ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  runDecision(
                    'complete',
                    'Mark complete only after source review has been completed.'
                  )
                }
                className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
              >
                Complete
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs font-bold text-slate-500">Manager decision recorded — no further changes on this card.</p>
      )}
      {message ? <p className="mt-2 text-xs font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
    </article>
  )
}
