'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Clock, Mail, Play, RefreshCw, Shield } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet, founderPatch, founderPost } from '@/lib/founder/api/founder-api-client'
import type { AutonomyOverview, SchedulerTask } from '@/lib/founder/autonomy/scheduler-types'

type SchedulerStatusPayload = {
  overview: AutonomyOverview
  recentRuns: Array<{ taskType: string; status: string; summary: string; completedAt: string }>
}

const STATUS_TONE: Record<string, string> = {
  completed: 'text-emerald-300',
  failed: 'text-rose-300',
  running: 'text-cyan-300',
  skipped: 'text-slate-400',
  awaiting_approval: 'text-amber-300',
  idle: 'text-slate-500'
}

function TaskRow({
  task,
  onToggle,
  onRun
}: {
  task: SchedulerTask
  onToggle: (id: string, enabled: boolean) => void
  onRun: (id: string) => void
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4" data-testid={`scheduler-task-${task.taskType}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{task.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{task.taskType.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase ${STATUS_TONE[task.status] ?? 'text-slate-400'}`}>{task.status}</span>
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
        <div>Daily limit: {task.runsToday}/{task.maxRunsPerDay}</div>
        <div>Mode: {task.allowedMode.replace(/_/g, ' ')}</div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggle(task.id, !task.enabled)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5"
        >
          {task.enabled ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          onClick={() => onRun(task.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200"
        >
          <Play className="h-3 w-3" aria-hidden />
          Run now
        </button>
      </div>
    </article>
  )
}

export function FounderAutonomyPage() {
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<SchedulerStatusPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

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
    const result = await founderPost<{ result: { summary: string } }>('/autonomy/task/run', { taskId })
    if (result.ok) {
      setActionMessage(result.data.result.summary)
      await load()
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
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onRun={runTask} />
              ))}
            </div>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Live LLM" title="Approval gates" description="Live LLM runs require Tom approval. Recommendations only — no auto-execution.">
          <div className="space-y-3 text-sm" data-testid="live-llm-gate-status">
            {overview?.liveLlmGate ? (
              <>
                <p className="text-slate-300">
                  Internal adversarial: {overview.liveLlmGate.internalAdversarialPassed ? 'Passed' : 'Pending'} ·
                  Internal high-risk: {overview.liveLlmGate.internalHighRiskPassed ? 'Passed' : 'Pending'}
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

        <FounderSectionCard eyebrow="Email" title="Founder email reports" description={`Daily and weekly reports to ${overview?.emailSettings.recipient ?? 'Thomas.kelly@indicare.co.uk'}.`}>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Mail className="h-4 w-4 text-cyan-400" aria-hidden />
            Provider: {overview?.emailSettings.provider ?? 'dry_run'} ·
            Daily: {overview?.emailSettings.dailyEnabled ? 'On' : 'Off'} ·
            Weekly: {overview?.emailSettings.weeklyEnabled ? 'On' : 'Off'}
          </div>
          {overview?.emailHistory?.length ? (
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              {overview.emailHistory.slice(0, 5).map((record) => (
                <li key={record.id} className="flex items-center gap-2">
                  <Clock className="h-3 w-3" aria-hidden />
                  {record.subject} — {record.status}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No email reports sent yet.</p>
          )}
        </FounderSectionCard>

        {payload?.recentRuns?.length ? (
          <FounderSectionCard eyebrow="History" title="Recent scheduler runs">
            <ul className="space-y-2 text-sm text-slate-400">
              {payload.recentRuns.slice(0, 10).map((run, i) => (
                <li key={`${run.taskType}-${i}`}>
                  {run.taskType}: {run.status} — {run.summary}
                </li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}
