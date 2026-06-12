'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, ExternalLink, Loader2, Mail, Play, RefreshCw, Shield, X } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet, founderPatch, founderPost } from '@/lib/founder/api/founder-api-client'
import type {
  AutonomyOverview,
  EmailReportPreview,
  EmailReportRecord,
  SchedulerTask,
  SchedulerTaskRunResult
} from '@/lib/founder/autonomy/scheduler-types'

type SchedulerStatusPayload = {
  overview: AutonomyOverview
  recentRuns: SchedulerTaskRunResult[]
}

type TaskRunResponse = {
  status: 'completed' | 'failed' | 'redacted'
  taskId: string
  result?: SchedulerTaskRunResult
  errorCode?: string
  safeMessage?: string
  technicalMessage?: string
  auditRecordId?: string
  redactionCount?: number
  safetyStatus?: string
  emailReportId?: string
}

type TaskRunState = {
  loading: boolean
  message: string | null
  tone: 'success' | 'error' | 'warning' | 'info'
  technicalMessage?: string
}

const STATUS_TONE: Record<string, string> = {
  completed: 'text-emerald-300',
  failed: 'text-rose-300',
  running: 'text-cyan-300',
  skipped: 'text-slate-400',
  awaiting_approval: 'text-amber-300',
  idle: 'text-slate-500',
  redacted: 'text-amber-300',
  blocked: 'text-rose-300'
}

const RUN_STATUS_TONE: Record<string, string> = {
  completed: 'text-emerald-300/90',
  failed: 'text-rose-300/90',
  redacted: 'text-amber-300/90',
  blocked: 'text-rose-300/90',
  skipped: 'text-slate-500',
  awaiting_approval: 'text-amber-300/90'
}

function TaskRow({
  task,
  runState,
  onToggle,
  onRun
}: {
  task: SchedulerTask
  runState?: TaskRunState
  onToggle: (id: string, enabled: boolean) => void
  onRun: (id: string) => void
}) {
  const isRunning = runState?.loading ?? false

  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4" data-testid={`scheduler-task-${task.taskType}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{task.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{task.taskType.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase ${isRunning ? STATUS_TONE.running : (STATUS_TONE[task.status] ?? 'text-slate-400')}`}
            data-testid={`scheduler-task-status-${task.taskType}`}
          >
            {isRunning ? 'running' : task.status}
          </span>
          {task.approvalRequired ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              Approval gated
            </span>
          ) : null}
        </div>
      </div>
      <dl className="mt-3 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
        <div>Last run: {task.lastRunAt ? new Date(task.lastRunAt).toLocaleString('en-GB') : 'Never'}</div>
        <div>Next run: {task.nextRunAt ? new Date(task.nextRunAt).toLocaleString('en-GB') : 'Manual'}</div>
        <div>
          Daily limit: {task.runsToday}/{task.maxRunsPerDay}
        </div>
        <div>Mode: {task.allowedMode.replace(/_/g, ' ')}</div>
      </dl>

      {runState?.message && !isRunning ? (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            runState.tone === 'error'
              ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
              : runState.tone === 'warning'
                ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          }`}
          data-testid={`scheduler-task-feedback-${task.taskType}`}
        >
          <p>{runState.message}</p>
          {runState.technicalMessage ? (
            <p className="mt-1 font-mono text-[10px] opacity-80">{runState.technicalMessage}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggle(task.id, !task.enabled)}
          disabled={isRunning}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5 disabled:opacity-50"
        >
          {task.enabled ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          onClick={() => onRun(task.id)}
          disabled={isRunning}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200 disabled:opacity-50"
          data-testid={`scheduler-run-now-${task.taskType}`}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Running…
            </>
          ) : (
            <>
              <Play className="h-3 w-3" aria-hidden />
              Run now
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function EmailPreviewPanel({ preview, onClose }: { preview: EmailReportPreview; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      data-testid="email-report-preview-panel"
      role="dialog"
      aria-label="Email report preview"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Report preview</p>
            <h2 className="mt-1 text-lg font-bold text-white">{preview.subject}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <dl className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Recipient</dt>
            <dd>{preview.recipient}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Provider</dt>
            <dd>{preview.provider}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Generated</dt>
            <dd>{new Date(preview.generatedAt).toLocaleString('en-GB')}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Safety status</dt>
            <dd className="capitalize">{preview.safetyStatus}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Redactions</dt>
            <dd>{preview.redactionCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">No real child data</dt>
            <dd>{preview.noRealChildDataConfirmed ? 'Confirmed' : 'Not confirmed'}</dd>
          </div>
        </dl>

        {preview.redactions.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
            <p className="text-xs font-bold uppercase text-amber-300">Redacted sections</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
              {preview.redactions.map((r) => (
                <li key={r.sectionKey}>
                  {r.sectionKey}: {r.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview.approvalItems.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase text-slate-500">Approval items</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {preview.approvalItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {Object.entries(preview.sections).map(([key, lines]) => (
            <div key={key} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {lines.map((line, i) => (
                  <li key={`${key}-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FounderAutonomyPage() {
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<SchedulerStatusPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [taskRunStates, setTaskRunStates] = useState<Record<string, TaskRunState>>({})
  const [preview, setPreview] = useState<EmailReportPreview | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await founderGet<SchedulerStatusPayload>('/autonomy')
    if (result.ok) {
      setPayload(result.data)
    } else {
      setError(result.error ?? 'Failed to load autonomy settings')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleTask = async (taskId: string, enabled: boolean) => {
    const result = await founderPatch<{ task: SchedulerTask }>('/autonomy/task', { taskId, enabled })
    if (result.ok) {
      setActionMessage(`Task ${enabled ? 'enabled' : 'disabled'}.`)
      await load()
    }
  }

  const runTask = async (taskId: string) => {
    setTaskRunStates((prev) => ({
      ...prev,
      [taskId]: { loading: true, message: null, tone: 'info' }
    }))

    const result = await founderPost<TaskRunResponse>('/autonomy/task/run', { taskId })

    if (!result.ok) {
      setTaskRunStates((prev) => ({
        ...prev,
        [taskId]: {
          loading: false,
          message: `Failed — ${result.error}`,
          tone: 'error',
          technicalMessage: result.error
        }
      }))
      setActionMessage(`Run failed: ${result.error}`)
      await load()
      return
    }

    const data = result.data

    if (data.status === 'failed') {
      setTaskRunStates((prev) => ({
        ...prev,
        [taskId]: {
          loading: false,
          message: `Failed — ${data.safeMessage ?? data.result?.summary ?? 'Task error'}`,
          tone: 'error',
          technicalMessage: data.technicalMessage
        }
      }))
      setActionMessage(`Failed — ${data.safeMessage ?? 'Task error, see audit trail'}`)
    } else if (data.status === 'redacted') {
      setTaskRunStates((prev) => ({
        ...prev,
        [taskId]: {
          loading: false,
          message: `Completed — Dry run preview generated (${data.redactionCount ?? 0} section(s) redacted).`,
          tone: 'warning',
          technicalMessage: data.technicalMessage
        }
      }))
      setActionMessage(data.result?.summary ?? 'Preview generated with redactions.')
    } else {
      setTaskRunStates((prev) => ({
        ...prev,
        [taskId]: {
          loading: false,
          message: `Completed — ${data.result?.summary ?? data.safeMessage ?? 'Task finished'}`,
          tone: 'success'
        }
      }))
      setActionMessage(data.result?.summary ?? data.safeMessage ?? 'Task completed.')
    }

    await load()

    if (data.emailReportId || taskId.includes('email_report')) {
      const previewResult = await founderGet<{ preview: EmailReportPreview | null }>('/autonomy/email/preview')
      if (previewResult.ok && previewResult.data.preview) {
        setPreview(previewResult.data.preview)
      }
    }
  }

  const openLatestPreview = async () => {
    const previewResult = await founderGet<{ preview: EmailReportPreview | null; record: EmailReportRecord | null }>(
      '/autonomy/email/preview'
    )
    if (previewResult.ok && previewResult.data.preview) {
      setPreview(previewResult.data.preview)
    } else {
      setActionMessage('No report preview available yet. Run the daily founder email report first.')
    }
  }

  const tickScheduler = async () => {
    const result = await founderPost<{ tasksRun: number }>('/autonomy/tick', {})
    if (result.ok) {
      setActionMessage(`Scheduler tick: ${result.data.tasksRun} task(s) processed.`)
      await load()
    }
  }

  const overview = payload?.overview
  const latestEmail = overview?.emailHistory?.[0]

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Autonomous Intelligence Scheduler"
          subtitle="Internal-brain testing runs automatically. Live LLM, PRs, publishing and external communications remain approval-gated. Tom remains the approval gate."
        />

        {error ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}
        {actionMessage ? (
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-200">{actionMessage}</div>
        ) : null}

        <FounderSectionCard eyebrow="Safety" title="Governance gates" description="These constraints cannot be overridden by the scheduler.">
          <ul className="space-y-2 text-sm text-slate-300" data-testid="autonomy-safety-gates">
            {(overview?.safetyGates ?? []).map((gate) => (
              <li key={gate} className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                {gate}
              </li>
            ))}
          </ul>
        </FounderSectionCard>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void tickScheduler()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-200"
            data-testid="scheduler-tick-button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Run scheduler tick
          </button>
          <button type="button" onClick={() => void load()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300">
            Refresh
          </button>
        </div>

        <FounderSectionCard eyebrow="Scheduler" title="Scheduled tasks" description="Enabled tasks run on their schedule. Disabled by default: live LLM, synthetic scenario generation, auto PR creation.">
          {loading ? (
            <p className="text-sm text-slate-400">Loading scheduler…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {(overview?.tasks ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  runState={taskRunStates[task.id]}
                  onToggle={toggleTask}
                  onRun={runTask}
                />
              ))}
            </div>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Live LLM" title="Approval gates" description="Live LLM runs require Tom approval. Recommendations only — no auto-execution.">
          <div className="space-y-3 text-sm" data-testid="live-llm-gate-status">
            {overview?.liveLlmGate ? (
              <>
                <p className="text-slate-300">
                  Internal adversarial: {overview.liveLlmGate.internalAdversarialPassed ? 'Passed' : 'Pending'} · Internal
                  high-risk: {overview.liveLlmGate.internalHighRiskPassed ? 'Passed' : 'Pending'}
                </p>
                {overview.liveLlmGate.currentRecommendation ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                    <p className="flex items-center gap-2 font-bold text-amber-200">
                      <AlertTriangle className="h-4 w-4" aria-hidden />
                      Tom approval required: {overview.liveLlmGate.currentRecommendation.replace(/_/g, ' ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400">No live LLM recommendation pending.</p>
                )}
                {overview.liveLlmGate.pendingApprovals.length > 0 ? (
                  <ul className="space-y-2">
                    {overview.liveLlmGate.pendingApprovals.map((item) => (
                      <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-slate-300">
                        <strong className="text-white">{item.title}</strong>
                        <p className="mt-1 text-xs">{item.reason}</p>
                        {item.estimatedCostGbp !== null ? (
                          <p className="mt-1 text-xs text-slate-500">Est. cost: £{item.estimatedCostGbp}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        </FounderSectionCard>

        <FounderSectionCard
          eyebrow="Email"
          title="Founder email reports"
          description={`Daily and weekly reports to ${overview?.emailSettings.recipient ?? 'Thomas.kelly@indicare.co.uk'}.`}
        >
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-400" aria-hidden />
              Provider: {overview?.emailSettings.provider ?? 'dry_run'} · Daily:{' '}
              {overview?.emailSettings.dailyEnabled ? 'On' : 'Off'} · Weekly:{' '}
              {overview?.emailSettings.weeklyEnabled ? 'On' : 'Off'}
            </div>
            <button
              type="button"
              onClick={() => void openLatestPreview()}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200"
              data-testid="view-latest-report-preview"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              View latest report preview
            </button>
          </div>

          {latestEmail ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-slate-400">
              <p className="font-bold text-slate-300">Latest preview</p>
              <p className="mt-1">
                {latestEmail.subject} — {latestEmail.status}
                {latestEmail.safetyStatus ? ` · Safety: ${latestEmail.safetyStatus}` : ''}
                {latestEmail.redactionCount ? ` · ${latestEmail.redactionCount} redaction(s)` : ''}
              </p>
            </div>
          ) : null}

          {overview?.emailHistory?.length ? (
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              {overview.emailHistory.slice(0, 5).map((record) => (
                <li key={record.id} className="flex items-center gap-2">
                  <Clock className="h-3 w-3" aria-hidden />
                  {record.subject} — {record.status}
                  {record.safetyStatus ? ` (${record.safetyStatus})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No email reports generated yet.</p>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="History" title="Recent scheduler runs" description="Includes completed, failed, blocked and redacted attempts.">
          {payload?.recentRuns?.length ? (
            <ul className="space-y-3 text-sm" data-testid="scheduler-run-history">
              {payload.recentRuns.slice(0, 10).map((run, i) => (
                <li
                  key={`${run.taskType}-${run.completedAt}-${i}`}
                  className="rounded-lg border border-white/10 bg-black/20 px-4 py-3"
                  data-testid={`scheduler-run-${run.taskType}-${run.status}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">{run.taskType}</span>
                    <span className={`text-xs font-bold uppercase ${RUN_STATUS_TONE[run.status] ?? 'text-slate-400'}`}>
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300">{run.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(run.completedAt).toLocaleString('en-GB')}</p>
                  {run.safeMessage && run.status === 'failed' ? (
                    <p className="mt-1 text-xs text-rose-300/80">{run.safeMessage}</p>
                  ) : null}
                  {run.auditRecordIds.length > 0 ? (
                    <Link href="/founder/audit" className="mt-2 inline-flex text-xs text-cyan-400 hover:text-cyan-300">
                      View audit trail →
                    </Link>
                  ) : null}
                  {run.emailReportId ? (
                    <button
                      type="button"
                      onClick={() => void openLatestPreview()}
                      className="mt-2 ml-3 inline-flex text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      View preview →
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No scheduler runs recorded yet.</p>
          )}
        </FounderSectionCard>
      </div>

      {preview ? <EmailPreviewPanel preview={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  )
}
