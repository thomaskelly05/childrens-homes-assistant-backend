'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  approveOrbCandidate,
  fetchOrbAdminBillingUsage,
  fetchOrbAdminCandidates,
  fetchOrbAdminFeedbackItems,
  fetchOrbAdminFeedbackSummary,
  rejectOrbCandidate,
  type OrbAdminFeedbackSummary,
  type OrbFeedbackItem,
  type OrbAdminUsageSummary,
  type OrbImprovementCandidate
} from '@/lib/orb/admin-quality-client'
import { AuthApiError } from '@/lib/auth/api'
import { useAuth } from '@/contexts/auth-context'
import { getQualityRuns } from '@/lib/founder/quality-lab'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'
import { getPrivacyRetentionReviewed } from '@/lib/orb/quality/launch-governance-store'
import Link from 'next/link'

const REASON_LABELS: Record<string, string> = {
  too_generic: 'Too generic',
  missed_safeguarding: 'Missed safeguarding',
  missed_child_voice: 'Missed child voice',
  missed_ofsted_reg44: 'Missed Reg 44 / Ofsted',
  missed_manager_oversight: 'Missed manager oversight',
  missed_nvq_learning: 'Missed NVQ learning',
  incorrect_source: 'Incorrect source',
  unsafe: 'Unsafe',
  wrong_role: 'Wrong role',
  not_practical: 'Not practical',
  other: 'Other'
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-orb-admin-stat={label}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function OrbQualityDashboard() {
  const { user, status } = useAuth()
  const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])

  const [summary, setSummary] = useState<OrbAdminFeedbackSummary | null>(null)
  const [items, setItems] = useState<OrbFeedbackItem[]>([])
  const [candidates, setCandidates] = useState<OrbImprovementCandidate[]>([])
  const [usage, setUsage] = useState<OrbAdminUsageSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    try {
      const [summaryData, itemsData, candidatesData, usageData] = await Promise.all([
        fetchOrbAdminFeedbackSummary(30),
        fetchOrbAdminFeedbackItems({ limit: 50 }),
        fetchOrbAdminCandidates('pending'),
        fetchOrbAdminBillingUsage(30)
      ])
      setSummary(summaryData)
      setItems(itemsData.items || [])
      setCandidates(candidatesData.candidates || [])
      setUsage(usageData)
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : 'Unable to load ORB quality review data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (status === 'loading') return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    void reload()
  }, [isAdmin, status, reload])

  const handleCandidateAction = async (candidateId: string, action: 'approve' | 'reject') => {
    setActionBusy(candidateId)
    try {
      const note = notes[candidateId] || undefined
      if (action === 'approve') {
        await approveOrbCandidate(candidateId, note)
      } else {
        await rejectOrbCandidate(candidateId, note)
      }
      await reload()
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Candidate review failed')
    } finally {
      setActionBusy(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-medium text-slate-600" data-orb-admin-loading>
        Loading ORB quality review…
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-medium text-amber-950"
        data-orb-admin-denied
      >
        Admin access is required to review ORB feedback, improvement candidates and billing usage.
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-900" data-orb-admin-error>
        {error}
      </div>
    )
  }

  const helpfulPct = summary ? `${Math.round((summary.helpful_ratio || 0) * 1000) / 10}%` : '—'
  const privacyRetentionReviewed = getPrivacyRetentionReviewed()
  const launchGate = computeOrbLaunchQualityGate({
    runs: getQualityRuns(),
    privacyRetentionReviewed
  })
  const publicLaunchBlockedByPrivacy =
    !privacyRetentionReviewed &&
    launchGate.blockers.some((blocker) => /privacy and retention review/i.test(blocker))

  return (
    <div className="space-y-8" data-orb-admin-quality-dashboard>
      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-orb-admin-launch-gate>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">ORB launch quality gate</h2>
            <p className="mt-1 text-sm text-slate-600">
              Live LLM GOLD verification summary from Quality Lab session memory.
            </p>
          </div>
          <Link
            href="/founder/quality-lab"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
          >
            Open Quality Lab
          </Link>
        </div>
        <p className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-500">Recommendation</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{launchGate.recommendation}</p>
        <p className="mt-2 text-sm text-slate-600">
          Critical failures: {launchGate.criticalFailures} · Pending human reviews: {launchGate.pendingHumanReviews} ·
          Whistleblowing covered: {launchGate.whistleblowingCovered ? 'yes' : 'no'}
        </p>
        {launchGate.blockers.length > 0 ? (
          <ul className="mt-3 list-inside list-disc text-sm text-rose-800">
            {launchGate.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
        {publicLaunchBlockedByPrivacy ? (
          <p
            className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
            data-orb-admin-privacy-retention-warning
          >
            Public launch is blocked until privacy and retention review is recorded in Quality Lab.
          </p>
        ) : null}
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Live LLM Quality Lab uses synthetic scenarios only. It must not include real child records.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-orb-admin-overview-cards>
        <StatCard label="Total feedback" value={summary?.total_feedback ?? 0} />
        <StatCard label="Helpful ratio" value={helpfulPct} />
        <StatCard label="Downvotes this week" value={summary?.downvotes_this_week ?? 0} />
        <StatCard label="Unsafe complaints" value={summary?.unsafe_answer_complaints ?? 0} />
        <StatCard label="Source / citation complaints" value={summary?.source_citation_complaints ?? 0} />
        <StatCard label="Cost this month" value={`£${(summary?.cost_this_month ?? 0).toFixed(2)}`} />
        <StatCard label="Estimated usage this month" value={summary?.estimated_usage_this_month ?? 0} />
        <StatCard label="Pending candidates" value={candidates.length} hint="Review-led improvements" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-orb-admin-reasons>
        <h2 className="text-lg font-black text-slate-950">Feedback reasons</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(summary?.top_downvote_reasons || []).map((entry) => (
            <div key={entry.reason} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-800">{REASON_LABELS[entry.reason] || entry.reason}</span>
              <span className="font-black text-slate-950">{entry.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-orb-admin-recurring-gaps>
        <h2 className="text-lg font-black text-slate-950">Recurring gaps</h2>
        <div className="mt-4 space-y-3">
          {(summary?.recurring_gaps || []).length === 0 ? (
            <p className="text-sm text-slate-600">No recurring gaps above threshold yet.</p>
          ) : (
            (summary?.recurring_gaps || []).map((gap) => (
              <div key={gap.gap} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-950">{gap.gap}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">{gap.count} reports</span>
                </div>
                <p className="mt-2 text-slate-600">
                  Families: {(gap.affected_families || []).join(', ') || '—'}
                </p>
                <p className="mt-1 font-medium text-indigo-900">{gap.suggested_action}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-orb-admin-candidates>
        <h2 className="text-lg font-black text-slate-950">Improvement candidates</h2>
        <p className="mt-1 text-sm text-slate-600">Approval creates a review trail only — no automatic prompt or scenario edits.</p>
        <div className="mt-4 space-y-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-600">No pending candidates.</p>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.candidate_id} className="rounded-xl border border-slate-100 p-4" data-orb-admin-candidate-row>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{candidate.candidate_type}</p>
                    <p className="text-sm text-slate-600">
                      {candidate.affected_family || 'General'} · {candidate.reason_count} related feedback
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Source feedback: {(candidate.source_feedback_ids || []).join(', ') || '—'}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{candidate.status}</span>
                </div>
                <textarea
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Reviewer note (optional)"
                  value={notes[candidate.candidate_id] || ''}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [candidate.candidate_id]: event.target.value }))
                  }
                  data-orb-admin-candidate-note
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                    disabled={actionBusy === candidate.candidate_id}
                    onClick={() => void handleCandidateAction(candidate.candidate_id, 'approve')}
                    data-orb-admin-candidate-approve
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 disabled:opacity-60"
                    disabled={actionBusy === candidate.candidate_id}
                    onClick={() => void handleCandidateAction(candidate.candidate_id, 'reject')}
                    data-orb-admin-candidate-reject
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-orb-admin-feedback-table>
        <h2 className="text-lg font-black text-slate-950">Feedback table</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Family</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={String(item.id)} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{item.rating}</td>
                  <td className="px-3 py-2">{REASON_LABELS[item.reason || ''] || item.reason || '—'}</td>
                  <td className="px-3 py-2">{item.mode || '—'}</td>
                  <td className="px-3 py-2">{item.detected_family || '—'}</td>
                  <td className="px-3 py-2">{item.prompt_tier || '—'}</td>
                  <td className="px-3 py-2">{item.reviewed ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5" data-orb-admin-usage-section>
        <h2 className="text-lg font-black text-slate-950">Usage & cost</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <StatCard label="Active users" value={usage?.total_active_users ?? 0} />
          <StatCard label="Total requests" value={usage?.total_requests ?? 0} />
          <StatCard label="Estimated cost" value={`£${(usage?.estimated_total_cost ?? 0).toFixed(2)}`} />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {Object.entries(usage?.prompt_tier_split || {}).map(([tier, count]) => (
            <div key={tier} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold">{tier}</span>
              <span className="font-black">{count}</span>
            </div>
          ))}
        </div>
        {(usage?.budget_warnings || []).length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {(usage?.budget_warnings || []).join(' ')}
          </div>
        ) : null}
      </section>
    </div>
  )
}
