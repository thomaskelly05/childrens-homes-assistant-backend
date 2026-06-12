/**
 * Connects micro-checks, brain audit, learning loop, approval queue and business report.
 */

import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'
import { addFounderAgentEvent } from '../agents/autonomous/founder-agent-event-store.ts'
import { getPendingApprovals } from '../approvals/approval-store.ts'
import { getPendingAgentApprovals } from '../agents/autonomous/founder-agent-actions.ts'
import { buildBrainCoverageAudit } from '../brain-audit/brain-audit-service.ts'
import {
  getLatestMicroCheck,
  getMicroCheckHistory
} from '../brain-audit/brain-audit-store.ts'
import type { BrainAuditSummary, MicroCheckRunRecord } from '../brain-audit/brain-audit-types.ts'
import { getAwaitingApprovalScenarios } from '../learning-loop/learning-loop-benchmark-bank.ts'
import { signalWeaknessFromCheck } from '../learning-loop/learning-loop-signal-handler.ts'
import { getPendingProposals } from '../learning-loop/learning-loop-store.ts'
import type { SchedulerTask, SchedulerTaskRunResult } from './scheduler-types.ts'
import { getLiveLlmGateStatus } from './live-llm-gate.ts'
import { scheduleAutonomyLoopPersistence } from './autonomy-loop-persistence.ts'
import {
  getEmailReportHistory,
  getSchedulerTask,
  getSchedulerTasks,
  getTaskRunHistory
} from './scheduler-store.ts'
import { formatDailyLocalSchedule, DEFAULT_BUSINESS_REPORT_TIMEZONE } from './scheduler-timezone.ts'
import { DEFAULT_EMAIL_SETTINGS } from './scheduler-defaults.ts'

export type AutonomousCheckSource =
  | 'micro-check'
  | 'focused-check'
  | 'nightly_benchmark'
  | 'weekly_audit'
  | 'manual_refresh'

export type MicroCheckResultPayload = {
  runId: string
  taskId: string
  scenarioCount: number
  domainsTested: string[]
  passCount: number
  failCount: number
  criticalFailures: number
  weakMarkers: string[]
  recommendedNextAction: string
  createdAt: string
  weaknessDetected: boolean
  weakness?: {
    area: string
    category: string
    marker: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    recommendedAction: string
  }
  noWeaknessMessage?: string
  proposalId?: string
  approvalItemId?: string
}

export type AutonomousLoopHealth = {
  status: 'healthy' | 'needs_attention' | 'blocked' | 'untested'
  latestMicroCheck: { status: string; completedAt: string | null; summary: string }
  latestFocusedCheck: { status: string; completedAt: string | null; summary: string }
  latestFullBenchmark: { status: string; completedAt: string | null; summary: string }
  latestBrainAudit: { updatedAt: string | null; lastUpdatedFrom: string | null; coveragePercent: number | null }
  openLearningProposals: number
  approvalQueueCount: number
  nextScheduledRun: string | null
  failedTasks: string[]
  businessReportStatus: string
  href: '/founder/autonomy' | '/founder/intelligence-centre/brain-audit'
}

function mapTriggerToSource(trigger: BrainAuditSummary['triggerType']): AutonomousCheckSource {
  if (trigger === 'micro_check') return 'micro-check'
  if (trigger === 'nightly_benchmark') return 'nightly_benchmark'
  if (trigger === 'weekly_deep_audit') return 'weekly_audit'
  return 'manual_refresh'
}

function buildRecommendedAction(record: Omit<MicroCheckResultPayload, 'createdAt' | 'weaknessDetected'>): string {
  if (record.criticalFailures > 0) {
    return `Review critical failures in ${record.domainsTested.slice(0, 3).join(', ')} and approve a learning proposal.`
  }
  if (record.weakMarkers.length > 0) {
    return `Strengthen weak markers: ${record.weakMarkers.slice(0, 3).join(', ')}.`
  }
  return 'Continue rotating micro-check coverage. No immediate action required.'
}

export function buildMicroCheckResultPayload(input: {
  record: MicroCheckRunRecord
  taskId: string
  source?: AutonomousCheckSource
}): MicroCheckResultPayload {
  const weaknessDetected =
    input.record.criticalFailures > 0 || input.record.weakMarkers.length > 0 || input.record.failed > 2

  const payload: MicroCheckResultPayload = {
    runId: input.record.id,
    taskId: input.taskId,
    scenarioCount: input.record.scenarioCount,
    domainsTested: input.record.areasTested,
    passCount: input.record.passed,
    failCount: input.record.failed,
    criticalFailures: input.record.criticalFailures,
    weakMarkers: input.record.weakMarkers,
    recommendedNextAction: buildRecommendedAction({
      runId: input.record.id,
      taskId: input.taskId,
      scenarioCount: input.record.scenarioCount,
      domainsTested: input.record.areasTested,
      passCount: input.record.passed,
      failCount: input.record.failed,
      criticalFailures: input.record.criticalFailures,
      weakMarkers: input.record.weakMarkers,
      recommendedNextAction: ''
    }),
    createdAt: input.record.completedAt,
    weaknessDetected
  }

  if (!weaknessDetected) {
    payload.noWeaknessMessage = 'No weakness detected in this run.'
    return payload
  }

  const primaryArea = input.record.areasTested[0] ?? 'coverage'
  const marker = input.record.weakMarkers[0] ?? `${input.record.failed} scenario failure(s)`
  payload.weakness = {
    area: primaryArea,
    category: input.source === 'focused-check' ? 'coverage' : 'safeguarding',
    marker,
    severity: input.record.criticalFailures > 0 ? 'critical' : input.record.failed > 2 ? 'high' : 'medium',
    recommendedAction: payload.recommendedNextAction
  }

  return payload
}

export function processAutonomousCheckResult(input: {
  record: MicroCheckRunRecord
  task: SchedulerTask
  source: AutonomousCheckSource
  auditTrigger: BrainAuditSummary['triggerType']
  evaluationRunId?: string
}): {
  payload: MicroCheckResultPayload
  audit: BrainAuditSummary
  signalResult?: ReturnType<typeof signalWeaknessFromCheck>
} {
  const payload = buildMicroCheckResultPayload({
    record: input.record,
    taskId: input.task.id,
    source: input.source
  })

  const audit = buildBrainCoverageAudit({
    triggerType: input.auditTrigger,
    lastUpdatedFrom: input.source,
    lastUpdatedTaskId: input.task.id,
    lastUpdatedRunId: input.record.id
  })

  recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'create_audit_note',
    summary: payload.weaknessDetected
      ? `Autonomous ${input.source}: weakness in ${payload.domainsTested.join(', ')} — ${payload.weakMarkers.join(', ')}`
      : `Autonomous ${input.source}: ${payload.noWeaknessMessage}`,
    approvalStatus: payload.weaknessDetected ? 'pending' : 'not_required',
    relatedRunId: input.record.id
  })

  addFounderAgentEvent({
    type: payload.weaknessDetected ? 'coverage_area_weak' : 'evaluation_run_completed',
    severity: payload.criticalFailures > 0 ? 'critical' : payload.weaknessDetected ? 'medium' : 'info',
    source: 'orb_evaluation',
    createdAt: input.record.completedAt,
    title: `${input.source} ${payload.weaknessDetected ? 'weakness detected' : 'completed'}`,
    summary: payload.weaknessDetected
      ? `${payload.weakMarkers.join(', ') || 'Review recommended'}`
      : payload.noWeaknessMessage ?? 'No weakness detected in this run.',
    relatedRunId: input.record.id,
    affectedAgents: ['orb-quality-agent'],
    payload: { ...payload, syntheticOnly: true, mode: 'internal-brain' },
    requiresReview: payload.weaknessDetected
  })

  let signalResult: ReturnType<typeof signalWeaknessFromCheck> | undefined
  if (payload.weaknessDetected && payload.weakness && input.source !== 'manual_refresh') {
    const history = getMicroCheckHistory(50)
    const repeatedMarkerCount = history.filter((h) =>
      h.weakMarkers.some((m) => payload.weakMarkers.includes(m))
    ).length

    signalResult = signalWeaknessFromCheck({
      source: input.source as Exclude<AutonomousCheckSource, 'manual_refresh'>,
      runId: input.record.id,
      taskId: input.task.id,
      area: payload.weakness.area,
      category: payload.weakness.category,
      marker: payload.weakness.marker,
      severity: payload.weakness.severity,
      recommendedAction: payload.weakness.recommendedAction,
      repeatedMarkerCount
    })

    payload.proposalId = signalResult.proposalId
    payload.approvalItemId = signalResult.approvalItemId
  }

  scheduleAutonomyLoopPersistence()
  return { payload, audit, signalResult }
}

function latestRunForTaskType(taskType: SchedulerTask['taskType']): SchedulerTaskRunResult | undefined {
  return getTaskRunHistory(100).find((run) => run.taskType === taskType)
}

function taskStatusLabel(taskType: SchedulerTask['taskType']): { status: string; completedAt: string | null; summary: string } {
  const task = getSchedulerTasks().find((t) => t.taskType === taskType)
  const latestRun = latestRunForTaskType(taskType)
  return {
    status: latestRun?.status ?? task?.status ?? 'untested',
    completedAt: latestRun?.completedAt ?? task?.lastRunAt ?? null,
    summary: latestRun?.summary ?? 'No runs recorded yet.'
  }
}

export function buildAutonomousLoopHealth(): AutonomousLoopHealth {
  const micro = taskStatusLabel('internal_brain_rotating_micro_check')
  const focused = taskStatusLabel('internal_brain_focused_check')
  const benchmark = taskStatusLabel('internal_brain_full')
  const audit = buildBrainCoverageAudit({ triggerType: 'manual' })
  const pendingProposals = getPendingProposals().length
  const approvalQueueCount = getPendingApprovals().length + getPendingAgentApprovals().length
  const failedTasks = getTaskRunHistory(20)
    .filter((run) => run.status === 'failed' || run.status === 'blocked')
    .map((run) => run.taskType)
  const latestReport = getEmailReportHistory()[0]
  const nextMicro = getSchedulerTasks().find((t) => t.taskType === 'internal_brain_rotating_micro_check')

  let status: AutonomousLoopHealth['status'] = 'healthy'
  let href: AutonomousLoopHealth['href'] = '/founder/autonomy'

  if (!micro.completedAt && !focused.completedAt && !benchmark.completedAt) {
    status = 'untested'
  } else if (failedTasks.length > 0 || audit.criticalFailureCount > 0) {
    status = 'needs_attention'
    href = '/founder/intelligence-centre/brain-audit'
  } else if (pendingProposals > 0 || approvalQueueCount > 0) {
    status = 'needs_attention'
  } else if (getLiveLlmGateStatus().pendingApprovals.some((a) => a.status === 'pending')) {
    status = 'blocked'
    href = '/founder/autonomy'
  }

  return {
    status,
    latestMicroCheck: micro,
    latestFocusedCheck: focused,
    latestFullBenchmark: benchmark,
    latestBrainAudit: {
      updatedAt: audit.generatedAt,
      lastUpdatedFrom: audit.lastUpdatedFrom ?? mapTriggerToSource(audit.triggerType),
      coveragePercent: audit.overallCoveragePercent
    },
    openLearningProposals: pendingProposals,
    approvalQueueCount,
    nextScheduledRun: nextMicro?.nextRunAt ?? null,
    failedTasks: [...new Set(failedTasks)],
    businessReportStatus: latestReport
      ? `${latestReport.status} · ${formatDailyLocalSchedule({
          hour: DEFAULT_EMAIL_SETTINGS.dailyHourLocal,
          minute: DEFAULT_EMAIL_SETTINGS.dailyMinuteLocal,
          timezone: DEFAULT_EMAIL_SETTINGS.dailyTimezone
        })}`
      : `Scheduled ${formatDailyLocalSchedule({
          hour: DEFAULT_EMAIL_SETTINGS.dailyHourLocal,
          minute: DEFAULT_EMAIL_SETTINGS.dailyMinuteLocal,
          timezone: DEFAULT_EMAIL_SETTINGS.dailyTimezone
        })}`,
    href
  }
}

export function buildAutonomousIntelligenceLoopReportSection(now = new Date()): string[] {
  const health = buildAutonomousLoopHealth()
  const micro = getLatestMicroCheck()
  const pendingProposals = getPendingProposals()
  const pendingBenchmarks = getAwaitingApprovalScenarios()
  const gate = getLiveLlmGateStatus()
  const today = now.toISOString().slice(0, 10)
  const todaysRuns = getTaskRunHistory(50).filter((run) => run.completedAt.startsWith(today))

  const lines: string[] = ['=== AUTONOMOUS INTELLIGENCE LOOP ===', '']

  if (todaysRuns.length === 0) {
    lines.push('No internal-brain automation has completed today.')
    lines.push('')
  }

  lines.push(`Latest micro-check: ${health.latestMicroCheck.summary}`)
  lines.push(`Latest focused check: ${health.latestFocusedCheck.summary}`)
  lines.push(
    `Latest brain audit update: ${health.latestBrainAudit.updatedAt ? new Date(health.latestBrainAudit.updatedAt).toLocaleString('en-GB') : 'None'} (${health.latestBrainAudit.lastUpdatedFrom ?? 'manual'})`
  )

  if (micro?.weakMarkers.length) {
    lines.push(`Weakest areas today: ${micro.weakMarkers.slice(0, 5).join(', ')}`)
  } else {
    lines.push('Weakest areas today: none flagged in latest micro-check.')
  }

  lines.push(`New learning proposals: ${pendingProposals.length}`)
  if (pendingProposals.length > 0) {
    for (const proposal of pendingProposals.slice(0, 3)) {
      lines.push(`• ${proposal.whatBrainShouldLearn.slice(0, 100)}… [awaiting Tom approval]`)
    }
  }

  lines.push(`Proposals awaiting Tom approval: ${pendingProposals.length}`)
  lines.push(`Benchmark scenarios awaiting approval: ${pendingBenchmarks.length}`)
  lines.push(
    `Live LLM gate status: ${gate.liveAdversarialPassed ? 'internal passed' : 'approval-gated'} — Tom approval required for live runs.`
  )
  lines.push(`Next recommended action: ${micro ? buildRecommendedAction(buildMicroCheckResultPayload({ record: micro, taskId: 'report' })) : 'Run scheduler tick or wait for next micro-check.'}`)
  lines.push('')
  lines.push('Synthetic evidence only. No real child data.')

  return lines
}
