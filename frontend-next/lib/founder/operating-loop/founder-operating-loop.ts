import { addFounderAction, refreshFounderActions } from '@/lib/founder/actions'
import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import { filterDeferredRecommendations } from '@/lib/founder/memory/founder-memory-staff-context'
import { getPendingApprovals } from '@/lib/founder/approvals'
import { generateBuildBriefFromCto } from '@/lib/founder/build-briefs'
import { generateLinkedInDraft } from '@/lib/founder/content'
import { operatingLoopRepository } from '@/lib/founder/persistence'
import type { FounderOperatingLoopRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { generateEvidencePackForAudience } from '@/lib/founder/evidence/evidence-store'
import { getFollowUpRecommendations } from '@/lib/founder/relationships/relationship-intelligence-engine'
import { executeQualityRun, getQualityLabSummary } from '@/lib/founder/quality-lab/quality-run-service'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import {
  getFounderTelemetrySummary,
  hydrateFounderTelemetryFromLiveData,
  refreshFounderTelemetrySummary
} from '@/lib/founder/telemetry'
import { runStaffAgent, type FounderStaffAgentId } from '@/lib/founder/team'
import type { FounderStaffAgentOutput } from '@/lib/founder/team/founder-team-types'
import { persistStaffTeamRun } from '@/lib/founder/team/staff-team-run-service'
import { buildRevenueSources } from '@/lib/founder/revenue/revenue-source-builder'
import { buildCommercialRisks } from '@/lib/founder/revenue/revenue-risks'
import { calculateAiMargin } from '@/lib/founder/revenue/ai-margin-engine'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import {
  addOperatingLoopRun,
  getLastOperatingLoopRun,
  getOperatingLoopRun,
  getOperatingLoopRuns
} from './operating-loop-store'
import type {
  FounderOperatingLoopPlan,
  FounderOperatingLoopRun,
  OperatingLoopRunResponse,
  OperatingLoopRunStatus
} from './operating-loop-types'
import { agentsForPlan, FULL_OPERATING_LOOP_PLAN } from './operating-loop-types'

export { getLastOperatingLoopRun, getOperatingLoopRun, getOperatingLoopRuns }

function buildDataBasis(): string {
  const telemetry = getFounderTelemetrySummary()
  const quality = getQualityLabSummary()
  const memory = getFounderStrategicContext()
  const parts: string[] = []

  if (telemetry.totalEvents > 0) {
    parts.push(`Live telemetry: ${telemetry.totalEvents} events, ${telemetry.orbConversations} ORB conversations`)
  } else {
    parts.push('Telemetry: no live events — agents use connected founder intelligence only')
  }

  if (quality.latestRun) {
    parts.push(
      `Quality Lab: latest run ${quality.latestRun.title} (${quality.latestRun.passRate}% pass, ${quality.openProposals} open proposals)`
    )
  } else {
    parts.push('Quality Lab: no persisted runs — quality sample may run if enabled')
  }

  if (memory.activeMemoryCount > 0) {
    parts.push(
      `Founder memory: ${memory.activeMemoryCount} active items (updated ${memory.memoryUpdatedAt ? new Date(memory.memoryUpdatedAt).toLocaleString('en-GB') : '—'})`
    )
  } else {
    parts.push('Founder memory: no strategic memory recorded yet')
  }

  return parts.join('. ')
}

function buildStrategicAlignment(memory = getFounderStrategicContext()): string[] {
  const alignment: string[] = []
  if (memory.primaryObjective) alignment.push(`Primary objective: ${memory.primaryObjective}`)
  if (memory.currentProductFocus) alignment.push(`Product focus: ${memory.currentProductFocus}`)
  if (memory.currentCommercialFocus) alignment.push(`Commercial focus: ${memory.currentCommercialFocus}`)
  if (memory.operatingPrinciples.length > 0) {
    alignment.push(`Operating principles: ${memory.operatingPrinciples.slice(0, 2).join('; ')}`)
  }
  if (memory.deferredObjectives.length > 0) {
    alignment.push(`Deferred work excluded unless requested: ${memory.deferredObjectives.slice(0, 2).join('; ')}`)
  }
  return alignment
}

function buildTelemetrySummary(): string {
  const telemetry = getFounderTelemetrySummary()
  if (telemetry.totalEvents === 0) {
    return 'No live telemetry events recorded yet.'
  }
  const modes = telemetry.topOrbModes.map((mode) => `${mode.mode} (${mode.count})`).join(', ')
  return `${telemetry.totalEvents} events; ${telemetry.orbConversations} ORB conversations; top modes: ${modes || '—'}`
}

function buildQualityLabSummary(): string {
  const summary = getQualityLabSummary()
  if (!summary.latestRun) {
    return 'No Quality Lab runs persisted. Run Quality Lab or enable quality sample in the operating loop.'
  }
  return `${summary.totalRuns} runs; latest "${summary.latestRun.title}" at ${summary.latestRun.passRate}% pass; ${summary.openProposals} open proposals (${summary.criticalProposals} critical)`
}

function safeErrorSummary(error: unknown): string {
  return (error instanceof Error ? error.message : 'Agent step failed').slice(0, 240)
}

function collectDecisions(outputs: Array<{ output: FounderStaffAgentOutput }>): string[] {
  const decisions = outputs.flatMap(({ output }) => output.recommendations.slice(0, 2))
  return [...new Set(decisions)].slice(0, 8)
}

function collectRisks(outputs: Array<{ output: FounderStaffAgentOutput }>): string[] {
  const risks = outputs.flatMap(({ output }) => output.risks)
  return [...new Set(risks)].slice(0, 12)
}

async function runQualitySampleIfNeeded(plan: FounderOperatingLoopPlan, errors: string[]): Promise<void> {
  if (!plan.runQualitySample) return
  try {
    await executeQualityRun({
      title: 'Operating loop quality sample',
      limit: 5,
      triggeredBy: 'operating-loop'
    })
  } catch (error) {
    errors.push(`Quality sample skipped: ${safeErrorSummary(error)}`)
  }
}

function generateActionsFromFindings(
  agentOutputs: Array<{ agentId: FounderStaffAgentId; output: FounderStaffAgentOutput }>
): string[] {
  const created: string[] = []
  const baseline = refreshFounderActions()
  const baselineIds = new Set(baseline.map((action) => action.id))

  for (const { output } of agentOutputs) {
    for (const recommendation of output.recommendations.slice(0, 2)) {
      const safety = checkFounderOutputSafety(recommendation)
      if (!safety.safe && safety.requiresReview) continue
      const action = addFounderAction({
        title: recommendation.slice(0, 120),
        detail: recommendation,
        source: 'Operating Loop'
      })
      created.push(action.id)
    }
  }

  const refreshed = refreshFounderActions()
  for (const action of refreshed) {
    if (!baselineIds.has(action.id) && !created.includes(action.id)) {
      created.push(action.id)
    }
  }
  const revenue = buildRevenueSources()
  const margin = calculateAiMargin(getFounderContractInputs().billingMetrics, {
    revenueAvailable: revenue.snapshot.mrr !== null
  })
  const commercialRisks = buildCommercialRisks(revenue.snapshot, margin)
  for (const risk of commercialRisks.slice(0, 2)) {
    const action = addFounderAction({
      title: `Commercial: ${risk.title}`.slice(0, 120),
      detail: `${risk.detail} — review in Revenue Intelligence.`,
      source: 'Revenue Intelligence'
    })
    created.push(action.id)
  }

  const followUps = getFollowUpRecommendations().slice(0, 3)
  for (const followUp of followUps) {
    const title = `Follow up: ${followUp.relationship.organisation}`
    const detail = `${followUp.intelligence.followUpReason ?? followUp.relationship.nextAction} — relationship intelligence`
    const safety = checkFounderOutputSafety(`${title} ${detail}`)
    if (!safety.safe && safety.requiresReview) continue
    const action = addFounderAction({
      title: title.slice(0, 120),
      detail,
      source: 'Relationship Intelligence'
    })
    created.push(action.id)
  }

  return created
}

function countNewApprovals(beforeIds: Set<string>): string[] {
  return getPendingApprovals()
    .filter((item) => !beforeIds.has(item.id))
    .map((item) => item.id)
}

/**
 * Manual founder operating loop — approval-based autonomy only.
 * Never posts, emails, deploys, or changes ORB production knowledge.
 */
export async function runFounderOperatingLoop(
  plan: FounderOperatingLoopPlan = FULL_OPERATING_LOOP_PLAN,
  triggeredBy = 'founder'
): Promise<OperatingLoopRunResponse> {
  const runId = nextId('loop-run')
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  const auditLogIds: string[] = []
  const staffAgentsRun: FounderOperatingLoopRun['staffAgentsRun'] = []
  const agentOutputs: Array<{ agentId: FounderStaffAgentId; output: FounderStaffAgentOutput }> = []

  const startedAudit = await appendAuditLog({
    actor: triggeredBy,
    eventType: 'run_started',
    entityType: 'operating_loop_run',
    entityId: runId,
    summary: 'Founder operating loop started',
    status: 'running'
  }).catch(() => null)
  if (startedAudit?.id) auditLogIds.push(startedAudit.id)

  let status: OperatingLoopRunStatus = 'running'

  const runningRecord: FounderOperatingLoopRun = {
    id: runId,
    status,
    startedAt,
    triggeredBy,
    dataBasis: 'Initialising…',
    telemetrySummary: '—',
    qualityLabSummary: '—',
    staffAgentsRun,
    actionsCreated: [],
    approvalsCreated: [],
    draftsCreated: [],
    buildBriefsCreated: [],
    risksIdentified: [],
    recommendedFounderDecisions: [],
    strategicAlignment: [],
    auditLogIds,
    errors
  }
  addOperatingLoopRun(runningRecord)

  try {
    await refreshFounderTelemetrySummary().catch(() => undefined)
    hydrateFounderTelemetryFromLiveData()

    const strategicMemory = getFounderStrategicContext()
    const strategicAlignment = buildStrategicAlignment(strategicMemory)
    const dataBasis = buildDataBasis()
    const telemetrySummary = buildTelemetrySummary()
    let qualityLabSummary = buildQualityLabSummary()

    await runQualitySampleIfNeeded(plan, errors)
    if (plan.runQualitySample) {
      qualityLabSummary = buildQualityLabSummary()
    }

    const approvalIdsBefore = new Set(getPendingApprovals().map((item) => item.id))
    const agentSequence = agentsForPlan(plan)

    for (const { id, label } of agentSequence) {
      try {
        const output = runStaffAgent(id)
        agentOutputs.push({ agentId: id, output })
        staffAgentsRun.push({
          agentId: id,
          label,
          status: 'complete',
          completedAt: new Date().toISOString()
        })
      } catch (error) {
        const errorSummary = safeErrorSummary(error)
        errors.push(`${label}: ${errorSummary}`)
        staffAgentsRun.push({
          agentId: id,
          label,
          status: 'failed',
          completedAt: new Date().toISOString(),
          errorSummary
        })
      }
    }

    const actionsCreated = plan.generateActions ? generateActionsFromFindings(agentOutputs) : []
    const draftsCreated: string[] = []
    const buildBriefsCreated: string[] = []

    if (plan.generateContentDrafts) {
      try {
        const draft = generateLinkedInDraft('weekly-progress')
        draftsCreated.push(draft.id)
      } catch (error) {
        errors.push(`Content draft: ${safeErrorSummary(error)}`)
      }
    }

    if (plan.generateBuildBriefs) {
      try {
        const brief = generateBuildBriefFromCto()
        buildBriefsCreated.push(brief.id)
      } catch (error) {
        errors.push(`Build brief: ${safeErrorSummary(error)}`)
      }
    }

    const approvalsCreated = plan.generateApprovals ? countNewApprovals(approvalIdsBefore) : []

    if (plan.generateApprovals && plan.runStaffAgents) {
      try {
        await generateEvidencePackForAudience('general', triggeredBy)
      } catch (error) {
        errors.push(`Evidence pack: ${safeErrorSummary(error)}`)
      }
    }

    const risksIdentified = collectRisks(agentOutputs)
    const recommendedFounderDecisions = filterDeferredRecommendations(
      collectDecisions(agentOutputs),
      strategicMemory.deferredObjectives
    )
    const chiefOutput = agentOutputs.find((entry) => entry.agentId === 'chief-of-staff')?.output
    const summary =
      chiefOutput?.summary ??
      recommendedFounderDecisions[0] ??
      'Operating loop complete. Review outputs and pending approvals.'

    const agentFailures = staffAgentsRun.filter((agent) => agent.status === 'failed').length
    status =
      agentFailures > 0 && agentFailures === staffAgentsRun.length
        ? 'failed'
        : errors.length > 0 || agentFailures > 0
          ? 'completed_with_warnings'
          : 'completed'

    const completedAt = new Date().toISOString()
    const completedRun: FounderOperatingLoopRun = {
      id: runId,
      status,
      startedAt,
      completedAt,
      triggeredBy,
      dataBasis,
      telemetrySummary,
      qualityLabSummary,
      staffAgentsRun,
      actionsCreated,
      approvalsCreated,
      draftsCreated,
      buildBriefsCreated,
      risksIdentified,
      recommendedFounderDecisions,
      strategicAlignment,
      auditLogIds,
      errors
    }

    const staffRun = await persistStaffTeamRun({
      agentOutputs,
      actionsGenerated: actionsCreated.length,
      draftsGenerated: draftsCreated.length,
      briefsGenerated: buildBriefsCreated.length,
      approvalsQueued: approvalsCreated.length,
      summary,
      actor: triggeredBy
    })

    const loopRecord: FounderOperatingLoopRunRecord = {
      id: runId,
      ...baseTimestamps(triggeredBy, 'operating-loop'),
      status: status === 'completed_with_warnings' ? 'complete' : status === 'completed' ? 'complete' : status,
      run: completedRun,
      staffTeamRunId: staffRun.id,
      errorSummary: errors.length > 0 ? errors.join('; ').slice(0, 500) : undefined
    }
    await operatingLoopRepository.persistResult(loopRecord, triggeredBy)

    const completedAudit = await appendAuditLog({
      actor: triggeredBy,
      eventType: status === 'failed' ? 'run_failed' : 'run_completed',
      entityType: 'operating_loop_run',
      entityId: runId,
      summary:
        status === 'failed'
          ? errors[0] ?? 'Operating loop failed'
          : `Operating loop ${status.replace(/_/g, ' ')}`,
      status,
      metadata: {
        actions: actionsCreated.length,
        approvals: approvalsCreated.length,
        drafts: draftsCreated.length,
        buildBriefs: buildBriefsCreated.length
      }
    }).catch(() => null)
    if (completedAudit?.id) auditLogIds.push(completedAudit.id)

    completedRun.auditLogIds = auditLogIds
    addOperatingLoopRun(completedRun)

    return {
      runId,
      status,
      summary,
      created: {
        actions: actionsCreated.length,
        approvals: approvalsCreated.length,
        drafts: draftsCreated.length,
        buildBriefs: buildBriefsCreated.length
      },
      warnings: errors
    }
  } catch (error) {
    const safeSummary = safeErrorSummary(error)
    errors.push(safeSummary)
    status = 'failed'

    const failedRun: FounderOperatingLoopRun = {
      id: runId,
      status,
      startedAt,
      completedAt: new Date().toISOString(),
      triggeredBy,
      dataBasis: buildDataBasis(),
      telemetrySummary: buildTelemetrySummary(),
      qualityLabSummary: buildQualityLabSummary(),
      staffAgentsRun,
      actionsCreated: [],
      approvalsCreated: [],
      draftsCreated: [],
      buildBriefsCreated: [],
      risksIdentified: [],
      recommendedFounderDecisions: [],
      strategicAlignment: buildStrategicAlignment(),
      auditLogIds,
      errors
    }

    const loopRecord: FounderOperatingLoopRunRecord = {
      id: runId,
      ...baseTimestamps(triggeredBy, 'operating-loop'),
      status: 'failed',
      run: failedRun,
      errorSummary: safeSummary
    }
    await operatingLoopRepository.persistResult(loopRecord, triggeredBy)
    addOperatingLoopRun(failedRun)

    return {
      runId,
      status,
      summary: safeSummary,
      created: { actions: 0, approvals: 0, drafts: 0, buildBriefs: 0 },
      warnings: errors
    }
  }
}

/** @deprecated Use getLastOperatingLoopRun */
export function getLastOperatingLoopResult() {
  const run = getLastOperatingLoopRun()
  if (!run) return null
  return {
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? run.startedAt,
    steps: run.staffAgentsRun.map((agent) => ({
      id: agent.agentId,
      agentId: agent.agentId,
      label: agent.label,
      status: agent.status === 'complete' ? ('complete' as const) : agent.status === 'failed' ? ('skipped' as const) : ('skipped' as const),
      completedAt: agent.completedAt
    })),
    actionsGenerated: run.actionsCreated.length,
    draftsGenerated: run.draftsCreated.length,
    briefsGenerated: run.buildBriefsCreated.length,
    approvalsQueued: run.approvalsCreated.length,
    summary: run.recommendedFounderDecisions[0] ?? 'Operating loop complete'
  }
}
