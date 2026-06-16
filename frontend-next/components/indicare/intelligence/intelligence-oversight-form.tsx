'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Card, SectionHeader } from '@/components/indicare/ui'
import { clientCreateOversightReview } from '@/lib/os-api/intelligence-actions-client'

const REVIEW_TYPES = [
  { value: 'daily_brief_review', label: 'Daily brief review' },
  { value: 'safeguarding_review', label: 'Safeguarding review' },
  { value: 'evidence_gap_review', label: 'Evidence gap review' },
  { value: 'ofsted_readiness_review', label: 'Inspection evidence preparation review' },
  { value: 'record_quality_review', label: 'Record quality review' },
  { value: 'staff_support_review', label: 'Staff support review' }
]

const DECISION_OPTIONS: Array<{ value: string; label: string; schemaDecision: string }> = [
  { value: 'accepted_for_action', label: 'Accepted for action', schemaDecision: 'accepted' },
  { value: 'reviewed_no_action', label: 'Reviewed — no action required', schemaDecision: 'dismissed' },
  { value: 'further_information', label: 'Further information required', schemaDecision: 'deferred' },
  { value: 'escalated_rp', label: 'Escalated to responsible person', schemaDecision: 'accepted' },
  { value: 'escalated_sg', label: 'Escalated to safeguarding lead', schemaDecision: 'accepted' },
  { value: 'reg44_45_evidence', label: 'Added to Reg 44/45 evidence', schemaDecision: 'completed' }
]

const NOTICE =
  'This records manager oversight. It does not make or replace safeguarding, legal or inspection decisions. Decision support only.'

export function IntelligenceOversightForm({
  homeId,
  childId,
  staffId
}: {
  homeId?: string
  childId?: string
  staffId?: string
}) {
  const router = useRouter()
  const [reviewType, setReviewType] = useState(REVIEW_TYPES[0].value)
  const [decisionKey, setDecisionKey] = useState(DECISION_OPTIONS[0].value)
  const [managerNotes, setManagerNotes] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [linkedActionIds, setLinkedActionIds] = useState('')
  const [linkedFindingIds, setLinkedFindingIds] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const decisionOption = DECISION_OPTIONS.find((d) => d.value === decisionKey) || DECISION_OPTIONS[0]
    const result = await clientCreateOversightReview({
      home_id: homeId,
      child_id: childId,
      staff_id: staffId,
      review_type: reviewType,
      source: 'intelligence_oversight_ui',
      decision: decisionOption.schemaDecision,
      decision_reason: `${decisionOption.label}${decisionReason ? ` — ${decisionReason}` : ''}`,
      manager_notes: managerNotes || undefined,
      follow_up_required: followUpRequired,
      follow_up_date: followUpDate || undefined,
      action_ids: linkedActionIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      finding_ids: linkedFindingIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Could not record oversight review.')
      return
    }
    setMessage(result.data.decision_support_notice || 'Manager oversight review recorded.')
    router.refresh()
  }

  return (
    <Card>
      <SectionHeader
        eyebrow="Manager oversight"
        title="Record oversight review"
        description="Records your review for audit and follow-up — not automated case management."
      />
      <p className="mb-6 text-sm font-bold leading-7 text-amber-900">{NOTICE}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          Review type
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
            value={reviewType}
            onChange={(e) => setReviewType(e.target.value)}
          >
            {REVIEW_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          Decision
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
            value={decisionKey}
            onChange={(e) => setDecisionKey(e.target.value)}
          >
            {DECISION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          Manager notes
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={4}
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
          />
        </label>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          Decision reason (optional detail)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={followUpRequired} onChange={(e) => setFollowUpRequired(e.target.checked)} />
          Follow-up required
        </label>
        {followUpRequired ? (
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
            Follow-up date
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </label>
        ) : null}
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          Linked action IDs (comma-separated)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={linkedActionIds}
            onChange={(e) => setLinkedActionIds(e.target.value)}
          />
        </label>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          Linked finding IDs (comma-separated)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={linkedFindingIds}
            onChange={(e) => setLinkedFindingIds(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Record oversight review'}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
    </Card>
  )
}
