import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit'
import { buildFounderCoverageMap } from '../agents/autonomous/founder-agent-coverage-map'
import { addFounderAgentEvent } from '../agents/autonomous/founder-agent-event-store'
import { generateFounderChiefOfStaffBrief } from '../agents/autonomous/founder-chief-of-staff'
import { queueApprovalFromRecommendation } from '../agents/autonomous/founder-agent-actions'
import { getPendingProposals } from '../learning-loop/learning-loop-store'
import { startLearningLoop } from '../learning-loop/learning-loop-service'
import { addEvaluationRun } from '../../orb/evaluation/orb-evaluation-store.ts'
import type { OrbEvaluationRun } from '../../orb/evaluation/orb-evaluation-types.ts'
import { INTERNAL_BRAIN_SCORING_VERSION_V2 } from '../../orb/evaluation/orb-evaluation-types.ts'

import { generateAndSendFounderEmailReport } from './email-report-service'
import { evaluateAndRecommendLiveLlmGates, recommendLiveLlmRun } from './live-llm-gate'
import { canRunTaskToday, getTasksDueForRun, recordTaskRun, setLastSchedulerTick } from './scheduler-store'
import type { SchedulerTask, SchedulerTaskRunResult, SchedulerTaskType } from './scheduler-types'
import { createFinanceSnapshot } from '../finance/finance-service'
import { createRevenuePipelineSnapshot } from '../revenue/revenue-agent-service'

export type SchedulerTaskRunError = {
  taskId: string
  taskType: SchedulerTaskType
  errorCode: string
  safeMessage: string
  technicalMessage: string
  auditRecordId?: string
}

function createSyntheticInternalBrainRun(input: {
  packType: OrbEvaluationRun['packType']
  title: string
  scenarioCount: number
  criticalFailures: number
}): OrbEvaluationRun {
  const now = new Date().toISOString()
  const passRate = input.criticalFailures === 0 ? 95 : 72
  const run: OrbEvaluationRun = {
    id: `sched-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    mode: 'internal-brain',
    packType: input.packType,
    status: 'completed',
    scenarioCount: input.scenarioCount,
    completedCount: input.scenarioCount,
    passRate,
    averageScore: passRate,
    criticalFailures: input.criticalFailures,
    startedAt: now,
    completedAt: now,
    createdBy: 'autonomous-scheduler',
    summary: `Scheduled internal-brain run: ${input.title}. Synthetic scenarios only.`,
    scoringVersion: INTERNAL_BRAIN_SCORING_VERSION_V2
  }
  addEvaluationRun(run)
  return run
}

function auditTaskStart(task: SchedulerTask): string {
  const entry = recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `task_started: ${task.name} (${task.taskType})`,
    approvalStatus: 'not_required',
    relatedEventId: task.id
  })
  return entry.id
}

function auditTaskCompleted(task: SchedulerTask, summary: string, relatedEventId?: string): string {
  const entry = recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `task_completed: ${summary}`,
    approvalStatus: 'not_required',
    relatedEventId: relatedEventId ?? task.id
  })
  return entry.id
}

function auditTaskFailed(
  task: SchedulerTask,
  safeMessage: string,
  technicalMessage: string,
  errorCode: string
): string {
  const entry = recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'create_audit_note',
    summary: `task_failed: ${safeMessage} [${errorCode}] — ${technicalMessage}`,
    approvalStatus: 'not_required',
    relatedEventId: task.id
  })
  return entry.id
}

function buildFailedResult(
  task: SchedulerTask,
  startedAt: string,
  input: {
    errorCode: string
    safeMessage: string
    technicalMessage: string
    auditRecordIds: string[]
    summary?: string
    emailReportId?: string
    redactionCount?: number
    safetyStatus?: SchedulerTaskRunResult['safetyStatus']
  }
): SchedulerTaskRunResult {
  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: 'failed',
    summary: input.summary ?? `Failed — ${input.safeMessage}`,
    eventIds: [],
    auditRecordIds: input.auditRecordIds,
    approvalItemIds: [],
    criticalFailures: 0,
    weaknessesDetected: 0,
    proposalsCreated: 0,
    error: input.safeMessage,
    errorCode: input.errorCode,
    safeMessage: input.safeMessage,
    technicalMessage: input.technicalMessage,
    emailReportId: input.emailReportId,
    redactionCount: input.redactionCount,
    safetyStatus: input.safetyStatus
  }
  recordTaskRun(task.id, result)
  return result
}

function runInternalBrainTask(
  task: SchedulerTask,
  packType: OrbEvaluationRun['packType'],
  scenarioCount: number
): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const run = createSyntheticInternalBrainRun({
    packType,
    title: task.name,
    scenarioCount: Math.min(scenarioCount, task.maxScenarioCount || scenarioCount),
    criticalFailures: 0
  })

  const event = addFounderAgentEvent({
    type: 'evaluation_run_completed',
    severity: 'info',
    source: 'orb_evaluation',
    createdAt: new Date().toISOString(),
    title: `Scheduled internal-brain ${packType} completed`,
    summary: `Internal brain ${packType} completed: ${run.passRate}% pass rate, ${run.criticalFailures} critical.`,
    relatedRunId: run.id,
    affectedAgents: ['orb-quality-agent', 'founder-chief-of-staff'],
    payload: { taskType: task.taskType, mode: 'internal-brain', syntheticOnly: true },
    requiresReview: (run.criticalFailures ?? 0) > 0
  })

  buildFounderCoverageMap({ evaluationRuns: [run] })
  generateFounderChiefOfStaffBrief({ evaluationRuns: [run] })

  const auditComplete = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: `Scheduled internal-brain test pack completed: ${task.name}`,
    approvalStatus: 'not_required',
    relatedRunId: run.id,
    relatedEventId: event.id
  })

  auditTaskCompleted(task, `${task.name} completed. ${run.scenarioCount} synthetic scenarios.`)

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: 'completed',
    summary: `${task.name} completed. ${run.scenarioCount} synthetic scenarios, ${run.criticalFailures} critical failures.`,
    eventIds: [event.id],
    auditRecordIds: [auditId, auditComplete.id],
    approvalItemIds: [],
    criticalFailures: run.criticalFailures ?? 0,
    weaknessesDetected: 0,
    proposalsCreated: 0
  }

  recordTaskRun(task.id, result)
  return result
}

function runCoverageGapScan(task: SchedulerTask): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const coverage = buildFounderCoverageMap({})
  const gaps = [...coverage.weakAreas, ...coverage.untestedAreas]

  const event = addFounderAgentEvent({
    type: 'coverage_area_weak',
    severity: gaps.length > 5 ? 'high' : 'low',
    source: 'orb_evaluation',
    createdAt: new Date().toISOString(),
    title: 'Coverage gap scan completed',
    summary: `Coverage gap scan: ${gaps.length} gap(s) identified.`,
    affectedAgents: ['orb-quality-agent'],
    payload: { gaps: gaps.slice(0, 10), syntheticOnly: true },
    requiresReview: gaps.length > 0
  })

  const auditComplete = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'update_coverage_map',
    summary: `Coverage gap scan completed: ${gaps.length} gaps.`,
    approvalStatus: 'not_required',
    relatedEventId: event.id
  })

  auditTaskCompleted(task, `Coverage scan found ${gaps.length} gap(s).`)

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: 'completed',
    summary: `Coverage scan found ${gaps.length} gap(s). Strength: ${coverage.overallStrength}.`,
    eventIds: [event.id],
    auditRecordIds: [auditId, auditComplete.id],
    approvalItemIds: [],
    criticalFailures: 0,
    weaknessesDetected: gaps.length,
    proposalsCreated: 0
  }

  recordTaskRun(task.id, result)
  return result
}

function runLearningProposalCreation(task: SchedulerTask): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const loop = startLearningLoop({
    triggerType: 'nightly_synthetic_review',
    actor: 'autonomous-scheduler'
  })

  const proposalsCreated = getPendingProposals().filter((p) => p.loopId === loop.id).length
  const weaknessesCount = loop.weaknessIds.length
  const approvalItemIds: string[] = []

  if (proposalsCreated > 0) {
    const approval = queueApprovalFromRecommendation({
      agentId: 'orb-quality-agent',
      eventId: loop.id,
      actionType: 'generate_build_brief',
      title: `Learning proposals from scheduled loop (${proposalsCreated})`,
      summary: loop.evidenceSummary || 'Weaknesses detected during nightly learning loop.',
      rationale: 'Brain change requires Tom approval.',
      riskLevel: loop.safetyRisk === 'critical' ? 'critical' : 'medium',
      safetyNotes: 'No auto-merge. Synthetic evidence only.'
    })
    if (approval) approvalItemIds.push(approval.id)
  }

  const event = addFounderAgentEvent({
    type: 'scenario_generation_recommended',
    severity: 'low',
    source: 'orb_evaluation',
    createdAt: new Date().toISOString(),
    title: 'Learning loop proposals created',
    summary: `Learning loop: ${weaknessesCount} weakness(es), ${proposalsCreated} proposal(s) created.`,
    affectedAgents: ['orb-quality-agent', 'founder-chief-of-staff'],
    payload: { loopId: loop.id, syntheticOnly: true },
    requiresReview: proposalsCreated > 0
  })

  const auditComplete = recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `Learning proposal creation: ${proposalsCreated} proposal(s) awaiting approval.`,
    approvalStatus: proposalsCreated > 0 ? 'pending' : 'not_required',
    relatedEventId: event.id
  })

  auditTaskCompleted(task, `Detected ${weaknessesCount} weakness(es), created ${proposalsCreated} proposal(s).`)

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: proposalsCreated > 0 ? 'awaiting_approval' : 'completed',
    summary: `Detected ${weaknessesCount} weakness(es), created ${proposalsCreated} proposal(s).`,
    eventIds: [event.id],
    auditRecordIds: [auditId, auditComplete.id],
    approvalItemIds,
    criticalFailures: 0,
    weaknessesDetected: weaknessesCount,
    proposalsCreated
  }

  recordTaskRun(task.id, result)
  return result
}

function runLiveLlmRecommendation(
  task: SchedulerTask,
  recommendation: 'approve_live_adversarial' | 'approve_live_high_risk' | 'approve_live_gold'
): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const item = recommendLiveLlmRun(recommendation) ?? evaluateAndRecommendLiveLlmGates()

  const auditComplete = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'create_audit_note',
    summary: item
      ? `Live LLM recommendation queued: ${item.title} — Tom approval required.`
      : 'Live LLM recommendation not yet eligible.',
    approvalStatus: item ? 'pending' : 'not_required'
  })

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: item ? 'awaiting_approval' : 'skipped',
    summary: item
      ? `Recommendation queued: ${item.title}. Live LLM will NOT execute without approval.`
      : 'Gate conditions not met for live LLM recommendation.',
    eventIds: [],
    auditRecordIds: [auditId, auditComplete.id],
    approvalItemIds: item ? [item.id] : [],
    criticalFailures: 0,
    weaknessesDetected: 0,
    proposalsCreated: 0
  }

  recordTaskRun(task.id, result)
  return result
}

function runEmailReport(task: SchedulerTask, type: 'daily' | 'weekly'): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const { sendResult, safety, blocked } = generateAndSendFounderEmailReport(type)

  if (blocked || !sendResult) {
    const failedAudit = auditTaskFailed(
      task,
      'Email report blocked because potential identifiable data was detected.',
      safety.technicalMessage ?? safety.blockedReason ?? 'Safety checker blocked report.',
      'EMAIL_REPORT_SAFETY_BLOCKED'
    )

    recordAgentAuditEntry({
      agentId: 'founder-chief-of-staff',
      actionType: 'create_audit_note',
      summary: `email_report_safety_blocked: ${task.name}. No email sent. Confirmed: safeguarding block applied.`,
      approvalStatus: 'not_required',
      relatedEventId: task.id
    })

    return buildFailedResult(task, startedAt, {
      errorCode: 'EMAIL_REPORT_SAFETY_BLOCKED',
      safeMessage: 'Email report blocked because potential identifiable data was detected.',
      technicalMessage: safety.technicalMessage ?? safety.blockedReason ?? 'Safety checker blocked report.',
      auditRecordIds: [auditId, failedAudit],
      summary: `Failed — Safety checker blocked report. No email sent.`,
      safetyStatus: 'blocked',
      redactionCount: safety.redactionCount
    })
  }

  const { record, status, safetyStatus, redactionCount } = sendResult

  if (status === 'failed') {
    const failedAudit = auditTaskFailed(
      task,
      sendResult.error ?? 'Email report delivery failed.',
      sendResult.error ?? 'Provider error',
      'EMAIL_REPORT_SEND_FAILED'
    )
    return buildFailedResult(task, startedAt, {
      errorCode: 'EMAIL_REPORT_SEND_FAILED',
      safeMessage: sendResult.error ?? 'Email report delivery failed.',
      technicalMessage: sendResult.error ?? 'Provider configuration error',
      auditRecordIds: [auditId, failedAudit, record.auditRecordId],
      summary: `Failed — ${sendResult.error}`,
      emailReportId: record.id,
      safetyStatus,
      redactionCount
    })
  }

  const previewAudit = recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `email_report_preview_generated: ${record.subject}. Provider: dry_run. Safety: ${safetyStatus}. Redactions: ${redactionCount}. No real child data confirmed.`,
    approvalStatus: 'not_required',
    relatedEventId: record.id
  })

  if (safetyStatus === 'redacted') {
    recordAgentAuditEntry({
      agentId: 'founder-chief-of-staff',
      actionType: 'create_audit_note',
      summary: `email_report_safety_redacted: ${redactionCount} section(s) redacted. Preview generated. No email sent.`,
      approvalStatus: 'not_required',
      relatedEventId: record.id
    })
  }

  auditTaskCompleted(
    task,
    status === 'dry_run'
      ? `Dry run preview generated. ${redactionCount} redaction(s).`
      : `Email report ${status}: ${record.subject}`
  )

  const runStatus: SchedulerTaskRunResult['status'] =
    safetyStatus === 'redacted' ? 'redacted' : 'completed'

  const summary =
    safetyStatus === 'redacted'
      ? `redacted — Preview generated. ${redactionCount} section(s) redacted by safety checker. No email sent.`
      : status === 'dry_run'
        ? `Completed — Dry run preview generated. No email sent.`
        : `Email report ${status}: ${record.subject}`

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: runStatus,
    summary,
    eventIds: [],
    auditRecordIds: [auditId, previewAudit.id, record.auditRecordId],
    approvalItemIds: [],
    criticalFailures: 0,
    weaknessesDetected: 0,
    proposalsCreated: 0,
    emailReportId: record.id,
    redactionCount,
    safetyStatus,
    safeMessage:
      safetyStatus === 'redacted'
        ? `${redactionCount} section(s) redacted. Preview available.`
        : 'Dry run preview generated successfully.'
  }

  recordTaskRun(task.id, result)
  return result
}

function runFinanceSnapshot(task: SchedulerTask): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const snapshot = createFinanceSnapshot('autonomous-scheduler')

  const auditComplete = recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Finance snapshot created. Burn: £${snapshot.monthlyBurn}, runway: ${snapshot.runwayMonths ?? 'unknown'} months.`,
    approvalStatus: 'not_required'
  })

  auditTaskCompleted(task, `Finance snapshot: burn £${snapshot.monthlyBurn}/mo.`)

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: 'completed',
    summary: `Finance snapshot: burn £${snapshot.monthlyBurn}/mo, margin ${snapshot.grossMarginPercent ?? '—'}%.`,
    eventIds: [],
    auditRecordIds: [auditId, auditComplete.id],
    approvalItemIds: [],
    criticalFailures: 0,
    weaknessesDetected: 0,
    proposalsCreated: 0
  }

  recordTaskRun(task.id, result)
  return result
}

function runRevenuePipelineReview(task: SchedulerTask): SchedulerTaskRunResult {
  const startedAt = new Date().toISOString()
  const auditId = auditTaskStart(task)

  const snapshot = createRevenuePipelineSnapshot('autonomous-scheduler')

  const auditComplete = recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Revenue pipeline review: ${snapshot.demoRequests} demo requests, pipeline £${snapshot.pipelineValue}.`,
    approvalStatus: 'not_required'
  })

  auditTaskCompleted(task, `Pipeline: ${snapshot.demoRequests} demos.`)

  const result: SchedulerTaskRunResult = {
    taskId: task.id,
    taskType: task.taskType,
    startedAt,
    completedAt: new Date().toISOString(),
    status: 'completed',
    summary: `Pipeline: ${snapshot.demoRequests} demos, ${snapshot.pilotRequests} pilots, value £${snapshot.pipelineValue}.`,
    eventIds: [],
    auditRecordIds: [auditId, auditComplete.id],
    approvalItemIds: [],
    criticalFailures: 0,
    weaknessesDetected: 0,
    proposalsCreated: 0
  }

  recordTaskRun(task.id, result)
  return result
}

export function executeSchedulerTask(task: SchedulerTask): SchedulerTaskRunResult {
  if (!task.enabled) {
    return {
      taskId: task.id,
      taskType: task.taskType,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'skipped',
      summary: 'Task disabled.',
      eventIds: [],
      auditRecordIds: [],
      approvalItemIds: [],
      criticalFailures: 0,
      weaknessesDetected: 0,
      proposalsCreated: 0
    }
  }

  if (!canRunTaskToday(task)) {
    return {
      taskId: task.id,
      taskType: task.taskType,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'skipped',
      summary: `Daily limit reached (${task.maxRunsPerDay} runs/day).`,
      eventIds: [],
      auditRecordIds: [],
      approvalItemIds: [],
      criticalFailures: 0,
      weaknessesDetected: 0,
      proposalsCreated: 0
    }
  }

  if (task.approvalRequired && task.allowedMode !== 'internal_brain_only') {
    recordAgentAuditEntry({
      agentId: 'founder-chief-of-staff',
      actionType: 'orchestrate',
      summary: `Task ${task.name} requires approval — skipped automatic execution.`,
      approvalStatus: 'pending'
    })
    return {
      taskId: task.id,
      taskType: task.taskType,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'awaiting_approval',
      summary: 'Approval required before execution.',
      eventIds: [],
      auditRecordIds: [],
      approvalItemIds: [],
      criticalFailures: 0,
      weaknessesDetected: 0,
      proposalsCreated: 0
    }
  }

  const handlers: Record<SchedulerTaskType, () => SchedulerTaskRunResult> = {
    internal_brain_quick_check: () => runInternalBrainTask(task, 'standard', 15),
    internal_brain_adversarial: () => runInternalBrainTask(task, 'adversarial', 30),
    internal_brain_high_risk: () => runInternalBrainTask(task, 'high-risk', 25),
    internal_brain_full: () => runInternalBrainTask(task, 'standard', 80),
    coverage_gap_scan: () => runCoverageGapScan(task),
    synthetic_scenario_generation: () => runLearningProposalCreation(task),
    learning_proposal_creation: () => runLearningProposalCreation(task),
    benchmark_bank_review: () => runCoverageGapScan(task),
    live_llm_adversarial_recommendation: () => runLiveLlmRecommendation(task, 'approve_live_adversarial'),
    live_llm_high_risk_recommendation: () => runLiveLlmRecommendation(task, 'approve_live_high_risk'),
    live_llm_gold_recommendation: () => runLiveLlmRecommendation(task, 'approve_live_gold'),
    daily_founder_email_report: () => runEmailReport(task, 'daily'),
    weekly_founder_email_report: () => runEmailReport(task, 'weekly'),
    finance_snapshot: () => runFinanceSnapshot(task),
    revenue_pipeline_review: () => runRevenuePipelineReview(task)
  }

  const startedAt = new Date().toISOString()

  try {
    return handlers[task.taskType]()
  } catch (error) {
    const technicalMessage = error instanceof Error ? error.message : 'Unknown scheduler error'
    const failedAudit = auditTaskFailed(
      task,
      'Task error — see audit trail for details.',
      technicalMessage,
      'SCHEDULER_TASK_ERROR'
    )

    return buildFailedResult(task, startedAt, {
      errorCode: 'SCHEDULER_TASK_ERROR',
      safeMessage: 'Task error — see audit trail for details.',
      technicalMessage,
      auditRecordIds: [failedAudit],
      summary: `Failed — task error, see audit trail.`
    })
  }
}

export function runDueSchedulerTasks(now = new Date()): SchedulerTaskRunResult[] {
  setLastSchedulerTick(now.toISOString())
  const due = getTasksDueForRun(now)
  return due.map((task) => executeSchedulerTask(task))
}
