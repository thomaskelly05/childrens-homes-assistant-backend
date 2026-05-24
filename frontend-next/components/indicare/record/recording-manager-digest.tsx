'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import {
  getRecordingAlertDigest,
  getRecordingAlertLastCheck,
  operationalOrbAlertHref,
  runRecordingAlertChecks,
  type RecordingAlertCheckRun,
  type RecordingAlertDigest
} from '@/lib/os-api/recording-alerts'

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

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'rose' | 'amber' | 'slate' }) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-100 bg-rose-50 text-rose-950'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-950'
        : 'border-slate-100 bg-white text-slate-950'
  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  )
}

export function RecordingManagerDigest({
  compact = false,
  childId,
  homeId,
  onChecksComplete
}: {
  compact?: boolean
  childId?: number
  homeId?: number
  onChecksComplete?: () => void
}) {
  const [digest, setDigest] = useState<RecordingAlertDigest | null>(null)
  const [lastCheck, setLastCheck] = useState<RecordingAlertCheckRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runMessage, setRunMessage] = useState<string | undefined>()
  const [unavailable, setUnavailable] = useState(false)

  const params =
    childId != null ? { child_id: childId } : homeId != null ? { home_id: homeId } : undefined

  const load = useCallback(async () => {
    setLoading(true)
    const [digestResult, lastResult] = await Promise.all([
      getRecordingAlertDigest(params),
      getRecordingAlertLastCheck()
    ])
    if (digestResult.ok) {
      setDigest(digestResult.data)
      setUnavailable(false)
    } else {
      setDigest(null)
      setUnavailable(true)
    }
    setLastCheck(lastResult.ok ? lastResult.data : null)
    setLoading(false)
  }, [params])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRunChecks() {
    setRunning(true)
    setRunMessage(undefined)
    const result = await runRecordingAlertChecks({
      ...params,
      force: false
    })
    setRunning(false)
    if (result.ok) {
      setRunMessage(
        `Checks complete: ${result.data.generated} generated, ${result.data.created} created, ${result.data.updated} updated, ${result.data.skipped} skipped.`
      )
      setLastCheck(result.data)
      await load()
      onChecksComplete?.()
    } else {
      setRunMessage(result.error || 'Check run failed.')
    }
  }

  if (loading) {
    return (
      <p className="text-sm font-semibold text-slate-600" data-testid="recording-manager-digest-loading">
        Loading recording oversight digest…
      </p>
    )
  }

  if (unavailable || !digest) {
    return (
      <section
        data-testid="recording-manager-digest-unavailable"
        className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm font-semibold text-slate-600"
      >
        Recording alert summary is unavailable. Open alerts to check manually.
        <div className="mt-3">
          <Link
            href={childId != null ? `/record/alerts?child_id=${childId}` : '/record/alerts'}
            className="text-xs font-black text-blue-700 underline"
          >
            Open recording alerts
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="recording-manager-digest"
      className={`space-y-4 rounded-[24px] border border-rose-100 bg-gradient-to-br from-rose-50/80 via-white to-indigo-50/40 ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-700">Recording oversight</p>
          <h2 className={`font-black tracking-[-0.04em] text-slate-950 ${compact ? 'text-lg' : 'text-xl'}`}>
            Manager recording digest
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            Review recording alerts, high-risk drafts and follow-up gaps.
          </p>
        </div>
        <p
          className="text-xs font-semibold text-slate-500"
          data-testid="recording-manager-digest-last-check"
        >
          Last check: {formatWhen(lastCheck?.completed_at || digest.last_check_at)}
        </p>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}`}>
        <Metric label="Open" value={digest.total_open} tone={digest.total_open ? 'amber' : undefined} />
        <Metric label="Urgent" value={digest.urgent} tone={digest.urgent ? 'rose' : undefined} />
        <Metric label="Safeguarding" value={digest.safeguarding} tone={digest.safeguarding ? 'rose' : undefined} />
        {!compact ? (
          <>
            <Metric label="Changes" value={digest.changes_requested} />
            <Metric label="Privacy" value={digest.privacy} />
            <Metric label="Overdue" value={digest.overdue} tone={digest.overdue ? 'rose' : undefined} />
          </>
        ) : null}
      </div>

      {digest.recommendations.length && !compact ? (
        <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Recommendations</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
            {digest.recommendations.slice(0, 4).map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="recording-manager-digest-run-checks"
          disabled={running}
          onClick={() => void handleRunChecks()}
          className="inline-flex min-h-10 items-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {running ? 'Running checks…' : 'Run checks now'}
        </button>
        <Link
          href={digest.routes.alerts}
          data-testid="recording-manager-digest-open-alerts"
          className="inline-flex min-h-10 items-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-950"
        >
          Open alerts
        </Link>
        <Link
          href={digest.routes.governance}
          className="inline-flex min-h-10 items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-black text-indigo-950"
        >
          Open governance
        </Link>
        <Link
          href={operationalOrbAlertHref('manager_daily_brief', 'Summarise recording oversight for my shift.')}
          data-testid="recording-manager-digest-ask-orb"
          className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-950"
        >
          Ask OS ORB
        </Link>
      </div>

      {runMessage ? (
        <p className="text-xs font-semibold text-slate-600" data-testid="recording-manager-digest-run-message">
          {runMessage}
        </p>
      ) : null}

      <p className="text-xs font-semibold text-slate-500" data-testid="recording-manager-digest-privacy">
        {digest.privacy_notice}
      </p>
    </section>
  )
}
