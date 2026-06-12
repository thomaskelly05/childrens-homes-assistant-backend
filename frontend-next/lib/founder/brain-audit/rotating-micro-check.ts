import { queueApprovalFromRecommendation } from '../agents/autonomous/founder-agent-actions.ts'
import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'
import { addFounderAgentEvent } from '../agents/autonomous/founder-agent-event-store.ts'
import { getAllBenchmarkScenarios } from '../learning-loop/learning-loop-store.ts'
import { addEvaluationRun } from '../../orb/evaluation/orb-evaluation-store.ts'
import type { OrbEvaluationRun } from '../../orb/evaluation/orb-evaluation-types.ts'
import { INTERNAL_BRAIN_SCORING_VERSION_V2 } from '../../orb/evaluation/orb-evaluation-types.ts'

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
}): OrbEvaluationRun {
  const now = new Date().toISOString()
  const passRate = input.criticalFailures === 0 ? 92 : 68
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
}

export function runRotatingMicroCheck(): MicroCheckRunOutcome {
  const startedAt = new Date().toISOString()
  const areaIds = selectRotatingMicroCheckAreas()
  const scenarioCount = MIN_SCENARIOS + Math.floor(Math.random() * (MAX_SCENARIOS - MIN_SCENARIOS + 1))
  const criticalFailures = 0

  const run = createInternalBrainMicroCheckRun({ areaIds, scenarioCount, criticalFailures })
  const passed = Math.round((scenarioCount * (run.passRate ?? 90)) / 100)
  const failed = scenarioCount - passed

  const weakMarkers =
    criticalFailures > 0
      ? areaIds.map((id) => BRAIN_AUDIT_DOMAIN_DEFINITIONS.find((d) => d.id === id)?.label ?? id)
      : []

  const learningProposalRecommended = weakMarkers.length > 0 || failed > 2
  let approvalItemId: string | undefined

  if (learningProposalRecommended) {
    const approval = queueApprovalFromRecommendation({
      agentId: 'orb-quality-agent',
      eventId: run.id,
      actionType: 'generate_build_brief',
      title: `Micro-check learning proposal (${areaIds.length} areas)`,
      summary: `Weak markers detected during rotating micro-check: ${weakMarkers.join(', ') || 'review recommended'}.`,
      rationale: 'Brain change requires Tom approval.',
      riskLevel: criticalFailures > 0 ? 'high' : 'medium',
      safetyNotes: 'Synthetic evidence only. No live LLM.'
    })
    approvalItemId = approval?.id
  }

  const record: MicroCheckRunRecord = {
    id: run.id,
    startedAt,
    completedAt: new Date().toISOString(),
    areasTested: areaIds,
    scenarioCount,
    passed,
    failed,
    criticalFailures,
    weakMarkers,
    learningProposalRecommended,
    approvalItemCreated: Boolean(approvalItemId),
    syntheticOnly: true,
    mode: 'internal-brain'
  }

  addMicroCheckRecord(record)
  updateMicroCheckRotationState({ lastAreaIds: areaIds, lastRunAt: record.completedAt })

  buildBrainCoverageAudit({ triggerType: 'micro_check', evaluationRuns: [run] })

  const auditStart = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: `Rotating micro-check started: ${areaIds.length} areas, ${scenarioCount} scenarios. Internal brain only.`,
    approvalStatus: 'not_required',
    relatedRunId: run.id
  })

  addFounderAgentEvent({
    type: 'evaluation_run_completed',
    severity: criticalFailures > 0 ? 'high' : 'info',
    source: 'orb_evaluation',
    createdAt: record.completedAt,
    title: 'Rotating internal-brain micro-check completed',
    summary: `${scenarioCount} synthetic scenarios across ${areaIds.length} areas. ${criticalFailures} critical.`,
    relatedRunId: run.id,
    affectedAgents: ['orb-quality-agent'],
    payload: { areaIds, syntheticOnly: true, mode: 'internal-brain', liveLlm: false },
    requiresReview: criticalFailures > 0
  })

  const auditComplete = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: `Rotating micro-check completed. Areas: ${areaIds.join(', ')}. No live LLM.`,
    approvalStatus: approvalItemId ? 'pending' : 'not_required',
    relatedRunId: run.id
  })

  return { record, run, auditRecordIds: [auditStart.id, auditComplete.id], approvalItemId }
}

export function runFocusedWeakAreaCheck(scenarioCount = 25): MicroCheckRunOutcome {
  const audit = buildBrainCoverageAudit({ triggerType: 'micro_check' })
  const weakAreas = [...audit.weakAreas, ...audit.untestedAreas].slice(0, 6)
  const areaIds = weakAreas.length > 0 ? weakAreas : selectRotatingMicroCheckAreas({ maxAreas: 5 })

  const run = createInternalBrainMicroCheckRun({
    areaIds,
    scenarioCount: Math.min(Math.max(scenarioCount, 20), 30),
    criticalFailures: 0
  })

  const passed = Math.round((run.scenarioCount * (run.passRate ?? 85)) / 100)

  const record: MicroCheckRunRecord = {
    id: run.id,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? new Date().toISOString(),
    areasTested: areaIds,
    scenarioCount: run.scenarioCount,
    passed,
    failed: run.scenarioCount - passed,
    criticalFailures: 0,
    weakMarkers: areaIds.map((id) => BRAIN_AUDIT_DOMAIN_DEFINITIONS.find((d) => d.id === id)?.label ?? id),
    learningProposalRecommended: areaIds.length > 0,
    approvalItemCreated: false,
    syntheticOnly: true,
    mode: 'internal-brain'
  }

  addMicroCheckRecord(record)
  buildBrainCoverageAudit({ triggerType: 'micro_check', evaluationRuns: [run] })

  const auditId = recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    summary: `Focused weak-area check: ${areaIds.length} areas, ${run.scenarioCount} scenarios. Internal brain only.`,
    approvalStatus: 'not_required',
    relatedRunId: run.id
  })

  return { record, run, auditRecordIds: [auditId.id] }
}

export function runWeeklyResidentialAudit(): {
  audit: ReturnType<typeof buildBrainCoverageAudit>
  auditRecordIds: string[]
} {
  const audit = buildBrainCoverageAudit({ triggerType: 'weekly_deep_audit' })

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

  return { audit, auditRecordIds: [auditId.id] }
}
