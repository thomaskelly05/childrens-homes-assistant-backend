'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { RecordingAlertActions } from '@/components/indicare/record/recording-alert-actions'
import { RecordingAlertCard } from '@/components/indicare/record/recording-alert-card'
import { RecordingAlertFilters, type AlertFilterKey } from '@/components/indicare/record/recording-alert-filters'
import { RecordingAlertSummaryCards } from '@/components/indicare/record/recording-alert-summary'
import { RecordingManagerDigest } from '@/components/indicare/record/recording-manager-digest'
import {
  getRecordingAlertLastCheck,
  getRecordingAlertSummary,
  listRecordingAlerts,
  operationalOrbAlertHref,
  RECORDING_ALERT_ORB_PROMPTS,
  runRecordingAlertChecks,
  type RecordingAlertCheckRun,
  type RecordingAlertRecord,
  type RecordingAlertSummary
} from '@/lib/os-api/recording-alerts'

const SAFEGUARDING_TYPES = new Set([
  'safeguarding_review_due',
  'safeguarding_escalation_required',
  'high_risk_review_due'
])

function isDueToday(alert: RecordingAlertRecord) {
  if (!alert.due_at) return false
  const due = new Date(alert.due_at)
  if (Number.isNaN(due.getTime())) return false
  const now = new Date()
  return due.toDateString() === now.toDateString()
}

function isOverdue(alert: RecordingAlertRecord) {
  if (!alert.due_at) return false
  const due = new Date(alert.due_at)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

function formatWhen(value?: string | null) {
  if (!value) return 'Not run yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function matchesFilter(alert: RecordingAlertRecord, filter: AlertFilterKey): boolean {
  if (filter === 'all') return alert.status !== 'archived'
  if (filter === 'resolved') return alert.status === 'resolved' || alert.status === 'archived'
  if (filter === 'urgent') return alert.severity === 'urgent' && alert.status !== 'resolved'
  if (filter === 'safeguarding') return SAFEGUARDING_TYPES.has(alert.alert_type)
  if (filter === 'privacy') return alert.alert_type === 'privacy_flags_unresolved'
  if (filter === 'missing_rhi')
    return alert.alert_type === 'missing_episode_follow_up_due' || alert.alert_type === 'rhi_follow_up_due'
  if (filter === 'medication') return alert.alert_type === 'medication_error_review_due'
  if (filter === 'changes_requested') return alert.alert_type === 'changes_requested_pending'
  if (filter === 'due_today') return isDueToday(alert) && alert.status !== 'resolved'
  if (filter === 'overdue') return isOverdue(alert) && alert.status !== 'resolved'
  return true
}

export function RecordingAlertsPage() {
  const searchParams = useSearchParams()
  const childIdParam = searchParams.get('child_id')
  const childId = childIdParam ? Number.parseInt(childIdParam, 10) : undefined
  const childFilter = Number.isFinite(childId) ? childId : undefined
  const draftIdFilter = searchParams.get('draft_id') || undefined

  const [alerts, setAlerts] = useState<RecordingAlertRecord[]>([])
  const [summary, setSummary] = useState<RecordingAlertSummary | null>(null)
  const [lastCheck, setLastCheck] = useState<RecordingAlertCheckRun | null>(null)
  const [filter, setFilter] = useState<AlertFilterKey>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningChecks, setRunningChecks] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [runMessage, setRunMessage] = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    const params: { child_id?: number; draft_id?: string } = {}
    if (childFilter != null) params.child_id = childFilter
    if (draftIdFilter) params.draft_id = draftIdFilter
    const [listResult, summaryResult, lastResult] = await Promise.all([
      listRecordingAlerts({ ...params, limit: 200 }),
      getRecordingAlertSummary(childFilter != null ? { child_id: childFilter } : undefined),
      getRecordingAlertLastCheck()
    ])
    setAlerts(listResult.ok ? listResult.data.items : [])
    setSummary(summaryResult.ok ? summaryResult.data : null)
    setLastCheck(lastResult.ok ? lastResult.data : null)
    setError(listResult.ok ? undefined : listResult.error)
    setLoading(false)
  }, [childFilter, draftIdFilter])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => alerts.filter((alert) => matchesFilter(alert, filter)),
    [alerts, filter]
  )

  const selected = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null

  async function handleRunChecks() {
    setRunningChecks(true)
    setRunMessage(undefined)
    const result = await runRecordingAlertChecks({
      child_id: childFilter,
      force: false
    })
    setRunningChecks(false)
    if (result.ok) {
      setRunMessage(
        `Checks complete: ${result.data.generated} generated, ${result.data.created} created, ${result.data.updated} updated, ${result.data.skipped} skipped.`
      )
      setLastCheck(result.data)
      await load()
    } else {
      setRunMessage(result.error || 'Check run failed.')
    }
  }

  return (
    <div data-testid="recording-alerts-page" className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Recording workspace</p>
        <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Recording alerts</h1>
        <p className="max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Follow up recording risks, review needs and quality gaps. Alerts support manager oversight; they do not
          replace professional judgement.
        </p>
        {childFilter != null ? (
          <p className="text-xs font-semibold text-slate-500">Filtered to young person ID {childFilter}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/record/governance"
            className="inline-flex min-h-10 items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-black text-indigo-950"
          >
            Recording governance
          </Link>
          <Link
            href="/record/reviews"
            className="inline-flex min-h-10 items-center rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-black text-purple-950"
          >
            Review queue
          </Link>
          <Link
            href="/command-centre/briefing"
            data-testid="recording-alerts-open-manager-daily-brief"
            className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-950"
          >
            Open manager daily brief
          </Link>
          <Link
            href={operationalOrbAlertHref('manager_daily_brief', 'Include recording alerts in today manager brief.')}
            data-testid="recording-alerts-ask-orb-brief"
            className="inline-flex min-h-10 items-center rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-950"
          >
            Ask ORB for manager brief
          </Link>
          <button
            type="button"
            data-testid="recording-alerts-run-checks"
            disabled={runningChecks}
            onClick={() => void handleRunChecks()}
            className="inline-flex min-h-10 items-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            {runningChecks ? 'Running checks…' : 'Run checks now'}
          </button>
        </div>
        <p
          className="text-xs font-semibold text-slate-500"
          data-testid="recording-alerts-last-check"
        >
          Last check: {formatWhen(lastCheck?.completed_at)}
        </p>
        {runMessage ? (
          <p className="text-xs font-semibold text-slate-600" data-testid="recording-alerts-run-message">
            {runMessage}
          </p>
        ) : null}
      </header>

      <section data-testid="recording-alerts-digest-panel">
        <RecordingManagerDigest compact childId={childFilter} onChecksComplete={() => void load()} />
      </section>

      {summary ? <RecordingAlertSummaryCards summary={summary} /> : null}

      <RecordingAlertFilters active={filter} onChange={setFilter} />

      {loading ? (
        <p className="text-sm font-semibold text-slate-600" data-testid="recording-alerts-loading">
          Loading recording alerts…
        </p>
      ) : error ? (
        <p className="text-sm font-semibold text-rose-700">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <ul className="space-y-2" data-testid="recording-alert-list">
            {filtered.length === 0 ? (
              <li
                className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500"
                data-testid="recording-alerts-empty-state"
              >
                No open recording alerts. Run checks to refresh.
              </li>
            ) : (
              filtered.map((alert) => (
                <li key={alert.id}>
                  <RecordingAlertCard
                    alert={alert}
                    selected={selected?.id === alert.id}
                    onSelect={() => setSelectedId(alert.id)}
                  />
                </li>
              ))
            )}
          </ul>
          <div className="space-y-4">
            {selected ? (
              <RecordingAlertActions
                alert={selected}
                onUpdated={(updated) => {
                  setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                }}
              />
            ) : (
              <p className="text-sm font-semibold text-slate-500">Select an alert to take action.</p>
            )}
            <section
              data-testid="recording-alert-orb-support"
              className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-800">ORB support</p>
              <ul className="space-y-1">
                {RECORDING_ALERT_ORB_PROMPTS.map((prompt) => (
                  <li key={prompt.label}>
                    <Link
                      href={operationalOrbAlertHref(prompt.mode, prompt.query)}
                      className="text-xs font-black text-indigo-800 underline"
                    >
                      {prompt.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <p
              className="text-xs font-semibold text-slate-500"
              data-testid="recording-alerts-safety-note"
            >
              Alerts use metadata and safe summaries only — not raw draft bodies. They do not make safeguarding
              threshold decisions or auto-resolve high-risk items. Safeguarding-sensitive alerts may require{' '}
              <Link href="/safeguarding" className="font-black text-violet-800 underline" data-testid="recording-alerts-isn-link">
                safeguarding network review
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
