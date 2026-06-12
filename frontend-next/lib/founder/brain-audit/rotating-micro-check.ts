import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'
import { addFounderAgentEvent } from '../agents/autonomous/founder-agent-event-store.ts'
import { signalWeaknessFromCheck } from '../learning-loop/learning-loop-signal-handler.ts'
import { getAllBenchmarkScenarios } from '../learning-loop/learning-loop-store.ts'
import { addEvaluationRun } from '../../orb/evaluation/orb-evaluation-store.ts'
import type { OrbEvaluationRun } from '../../orb/evaluation/orb-evaluation-types.ts'
import { INTERNAL_BRAIN_SCORING_VERSION_V2 } from '../../orb/evaluation/orb-evaluation-types.ts'
import {
  buildMicroCheckResultPayload,
  processAutonomousCheckResult
} from '../autonomy/autonomous-loop-service.ts'
import type { SchedulerTask } from '../autonomy/scheduler-types.ts'

import { BRAIN_AUDIT_DOMAIN_DEFINITIONS } from './brain-audit-domains.ts'
import { buildBrainCoverageAudit } from './brain-audit-service.ts'
import {
  addMicroCheckRecord,
  getMicroCheckRotationState,
  updateMicroCheckRotationState
} from './brain-audit-store.ts'
import type { BrainAuditAreaId, MicroCheckRunRecord } from './brain-audit-types.ts'

const MIN_SCENARIOS = 5
const MAX_SCENARIOS = 10

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export function selectRotatingMicroCheckAreas(input?: {
  weakAreaIds?: BrainAuditAreaId[]
  untestedAreaIds?: BrainAuditAreaId[]
  recentFailureAreaIds?: BrainAuditAreaId[]
  maxAreas?: number
}): BrainAuditAreaId[] {
  const audit = buildBrainCoverageAudit({ triggerType: 'micro_check' })
  const rotation = getMicroCheckRotationState()
  const maxAreas = input?.maxAreas ?? 4

  const weak = input?.weakAreaIds ?? audit.weakAreas
  const untested = input?.untestedAreaIds ?? audit.untestedAreas
  const recentFailures = input?.recentFailureAreaIds ?? []

  const newlyApproved = getAllBenchmarkScenarios()
    .filter((s) => s.status === 'approved_for_testing' || s.status === 'active_benchmark')
    .flatMap((s) => {
      const text = `${s.area} ${s.prompt}`.toLowerCase()
      return BRAIN_AUDIT_DOMAIN_DEFINITIONS.filter((d) =>
        d.keywords.some((kw) => text.includes(kw.toLowerCase()))
      ).map((d) => d.id)
    })

  const rng = seededRandom(Date.now())

  const priorityPool = shuffleWithRng(
    [...new Set([...recentFailures, ...weak, ...untested, ...newlyApproved])].filter(
      (id) => !rotation.lastAreaIds.includes(id)
    ),
    rng
  )

  const stablePool = shuffleWithRng(
    BRAIN_AUDIT_DOMAIN_DEFINITIONS.map((d) => d.id).filter(
      (id) =>
        !weak.includes(id) &&
        !untested.includes(id) &&
        !rotation.lastAreaIds.includes(id) &&
        !priorityPool.includes(id)
    ),
    rng
  )

  const selected: BrainAuditAreaId[] = []
  for (const id of priorityPool) {
    if (selected.length >= maxAreas) break
    selected.push(id)
  }

  const stableSlots = Math.min(2, maxAreas - selected.length)
  for (let i = 0; i < stableSlots && stablePool[i]; i++) {
    selected.push(stablePool[i]!)
  }

  if (selected.length === 0) {
    const fallback = shuffleWithRng(
      BRAIN_AUDIT_DOMAIN_DEFINITIONS.map((d) => d.id).filter((id) => !rotation.lastAreaIds.includes(id)),
      rng
    )
    return fallback.slice(0, maxAreas)
  }

  return selected
}

function createInternalBrainMicroCheckRun(input: {
  areaIds: BrainAuditAreaId[]
  scenarioCount: number
  criticalFailures: number
  passRateOverride?: number
}): OrbEvaluationRun {
  const now = new Date().toISOString()
  const passRate = input.passRateOverride ?? (input.criticalFailures === 0 ? 92 : 68)
  const labels = input.areaIds
    .map((id) => BRAIN_AUDIT_DOMAIN_DEFINITIONS.find((d) => d.id === id)?.label ?? id)
    .join(', ')

  const run: OrbEvaluationRun = {
    id: `micro-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `Rotating micro-check: ${labels}`,
    mode: 'internal-brain',
    packType: 'standard',
    status: 'completed',
    scenarioCount: input.scenarioCount,
    completedCount: input.scenarioCount,
    passRate,
    averageScore: passRate,
    criticalFailures: input.criticalFailures,
    startedAt: now,
    completedAt: now,
    createdBy: 'autonomous-scheduler',
    summary: `Rotating internal-brain micro-check across ${input.areaIds.length} area(s). Synthetic scenarios only. No live LLM.`,
    scoringVersion: INTERNAL_BRAIN_SCORING_VERSION_V2
  }

  addEvaluationRun(run)
  return run
}

export type MicroCheckRunOutcome = {
  record: MicroCheckRunRecord
  run: OrbEvaluationRun
  auditRecordIds: string[]
  approvalItemId?: string
  proposalId?: string
  resultPayload: ReturnType<typeof buildMicroCheckResultPayload>
}

export type MicroCheckRunOptions = {
  task?: SchedulerTask
  injectCriticalFailures?: number
  injectFailedCount?: number
}

export function runRotatingMicroCheck(options: MicroCheckRunOptions = {}): MicroCheckRunOutcome {
  const startedAt = new Date().toISOString()
  const areaIds = selectRotatingMicroCheckAreas()
  const scenarioCount = MIN_SCENARIOS + Math.floor(Math.random() * (MAX_SCENARIOS - MIN_SCENARIOS + 1))
  const criticalFailures = options.injectCriticalFailures ?? 0

  const run = createInternalBrainMicroCheckRun({ areaIds, scenarioCount, criticalFailures })
  const passed = Math.round((scenarioCount * (run.passRate ?? 90)) / 100)
  const failed = options.injectFailedCount ?? scenarioCount - passed

  const weakMarkers =
    criticalFailures > 0 || failed > 2
      ? areaIds.map((id) => BRAIN_AUDIT_DOMAIN_DEFINITIONS.find((d) => d.id === id)?.label ?? id)
      : []

  const task = options.task ?? ({
    id: 'scheduler-internal_brain_rotating_micro_check',
    taskType: 'internal_brain_rotating_micro_check'
  } as SchedulerTask)

  const record: MicroCheckRunRecord = {
    id: run.id,
    taskId: task.id,
    startedAt,
    completedAt: new Date().toISOString(),
    areasTested: areaIds,
    scenarioCount,
    passed,
    failed,
    criticalFailures,
    weakMarkers,
    learningProposalRecommended: weakMarkers.length > 0 || failed > 2,
    approvalItemCreated: false,
    syntheticOnly: true,
    mode: 'internal-brain'
  }

  addMicroCheckRecord(record)
  updateMicroCheckRotationState({ lastAreaIds: areaIds, lastRunAt: record.completedAt })

  const auditStart = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: `Rotating micro-check started: ${areaIds.length} areas, ${scenarioCount} scenarios. Internal brain only.`,
    approvalStatus: 'not_required',
    relatedRunId: run.id
  })

  const { payload, signalResult } = processAutonomousCheckResult({
    record,
    task,
    source: 'micro-check',
    auditTrigger: 'micro_check',
    evaluationRunId: run.id
  })

  record.recommendedNextAction = payload.recommendedNextAction
  record.noWeaknessMessage = payload.noWeaknessMessage
  record.proposalId = payload.proposalId
  record.learningProposalRecommended = payload.weaknessDetected
  record.approvalItemCreated = Boolean(payload.approvalItemId)

  const auditComplete = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: payload.weaknessDetected
      ? `Rotating micro-check completed with weakness. Areas: ${areaIds.join(', ')}.`
      : `Rotating micro-check completed. ${payload.noWeaknessMessage}`,
    approvalStatus: payload.approvalItemId ? 'pending' : 'not_required',
    relatedRunId: run.id
  })

  return {
    record,
    run,
    auditRecordIds: [auditStart.id, auditComplete.id],
    approvalItemId: payload.approvalItemId ?? signalResult?.approvalItemId,
    proposalId: payload.proposalId,
    resultPayload: payload
  }
}

export function runFocusedWeakAreaCheck(
  scenarioCount = 25,
  options: MicroCheckRunOptions = {}
): MicroCheckRunOutcome {
  const audit = buildBrainCoverageAudit({ triggerType: 'focused_check' })
  const weakAreas = [...audit.weakAreas, ...audit.untestedAreas].slice(0, 6)
  const areaIds = weakAreas.length > 0 ? weakAreas : selectRotatingMicroCheckAreas({ maxAreas: 5 })

  const run = createInternalBrainMicroCheckRun({
    areaIds,
    scenarioCount: Math.min(Math.max(scenarioCount, 20), 30),
    criticalFailures: options.injectCriticalFailures ?? 0,
    passRateOverride: 75
  })

  const passed = Math.round((run.scenarioCount * (run.passRate ?? 85)) / 100)
  const failed = options.injectFailedCount ?? run.scenarioCount - passed

  const task = options.task ?? ({
    id: 'scheduler-internal_brain_focused_check',
    taskType: 'internal_brain_focused_check'
  } as SchedulerTask)

  const record: MicroCheckRunRecord = {
    id: run.id,
    taskId: task.id,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? new Date().toISOString(),
    areasTested: areaIds,
    scenarioCount: run.scenarioCount,
    passed,
    failed,
    criticalFailures: options.injectCriticalFailures ?? 0,
    weakMarkers: areaIds.map((id) => BRAIN_AUDIT_DOMAIN_DEFINITIONS.find((d) => d.id === id)?.label ?? id),
    learningProposalRecommended: areaIds.length > 0,
    approvalItemCreated: false,
    syntheticOnly: true,
    mode: 'internal-brain'
  }

  addMicroCheckRecord(record)

  const auditId = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: `Focused weak-area check: ${areaIds.length} areas, ${run.scenarioCount} scenarios. Internal brain only.`,
    approvalStatus: 'not_required',
    relatedRunId: run.id
  })

  const { payload, signalResult } = processAutonomousCheckResult({
    record,
    task,
    source: 'focused-check',
    auditTrigger: 'focused_check',
    evaluationRunId: run.id
  })

  record.recommendedNextAction = payload.recommendedNextAction
  record.proposalId = payload.proposalId
  record.approvalItemCreated = Boolean(payload.approvalItemId)

  return {
    record,
    run,
    auditRecordIds: [auditId.id],
    approvalItemId: payload.approvalItemId ?? signalResult?.approvalItemId,
    proposalId: payload.proposalId,
    resultPayload: payload
  }
}

export function runWeeklyResidentialAudit(): {
  audit: ReturnType<typeof buildBrainCoverageAudit>
  auditRecordIds: string[]
} {
  const audit = buildBrainCoverageAudit({
    triggerType: 'weekly_deep_audit',
    lastUpdatedFrom: 'weekly_audit'
  })

  const auditId = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'update_coverage_map',
    summary: `Weekly deep residential audit: ${audit.topMissingWeakAreas.length} top weak/missing areas. Coverage ${audit.overallCoveragePercent}%.`,
    approvalStatus: audit.recommendedLearningProposalCount > 0 ? 'pending' : 'not_required'
  })

  addFounderAgentEvent({
    type: 'coverage_area_weak',
    severity: audit.weakAreas.length > 5 ? 'high' : 'medium',
    source: 'orb_evaluation',
    createdAt: audit.generatedAt,
    title: 'Weekly internal brain residential audit',
    summary: `Top gaps: ${audit.topMissingWeakAreas
      .slice(0, 3)
      .map((a) => a.label)
      .join(', ')}. Synthetic only.`,
    affectedAgents: ['orb-quality-agent', 'founder-chief-of-staff'],
    payload: { topMissing: audit.topMissingWeakAreas, syntheticOnly: true },
    requiresReview: audit.weakAreas.length > 0
  })

  if (audit.topMissingWeakAreas[0]) {
    const top = audit.topMissingWeakAreas[0]
    signalWeaknessFromCheck({
      source: 'weekly_audit',
      runId: audit.id,
      area: top.id,
      category: 'coverage',
      marker: top.reason,
      severity: audit.criticalFailureCount > 0 ? 'critical' : 'high',
      recommendedAction: `Address weekly audit gap: ${top.label}`
    })
  }

  return { audit, auditRecordIds: [auditId.id] }
}
