import {
  agentRunRepository,
  safetyReviewRepository,
  staffTeamRunRepository
} from '@/lib/founder/persistence'
import type {
  FounderAgentRunRecord,
  FounderSafetyReviewRecord,
  FounderStaffTeamRunRecord
} from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import type { FounderStaffAgentId, FounderStaffAgentOutput } from './founder-team-types'

export async function persistStaffTeamRun(input: {
  agentOutputs: Array<{ agentId: FounderStaffAgentId; output: FounderStaffAgentOutput }>
  actionsGenerated: number
  draftsGenerated: number
  briefsGenerated: number
  approvalsQueued: number
  summary?: string
  actor?: string
}): Promise<FounderStaffTeamRunRecord> {
  const actor = input.actor ?? 'founder'
  const runId = nextId('staff-run')
  const startedAt = new Date().toISOString()
  const agentRunIds: string[] = []
  const safetyReviewIds: string[] = []

  const runRecord: FounderStaffTeamRunRecord = {
    id: runId,
    ...baseTimestamps(actor, 'staff-team'),
    status: 'running',
    startedAt,
    agentRunIds,
    actionsGenerated: input.actionsGenerated,
    draftsGenerated: input.draftsGenerated,
    briefsGenerated: input.briefsGenerated,
    approvalsQueued: input.approvalsQueued,
    safetyReviewIds,
    summary: input.summary
  }

  await staffTeamRunRepository.create(runRecord, { actor, auditSummary: 'Staff team run started' })

  try {
    for (const { agentId, output } of input.agentOutputs) {
      const agentRunId = nextId('agent-run')
      const safety = checkFounderOutputSafety(output.summary)
      const agentRecord: FounderAgentRunRecord = {
        id: agentRunId,
        ...baseTimestamps(actor, 'staff-team'),
        status: 'complete',
        staffTeamRunId: runId,
        agentId,
        outputSummary: safety.redactedContent.slice(0, 500),
        findings: output.findings,
        recommendations: output.recommendations,
        actions: output.actions,
        risks: output.risks,
        requiresApproval: output.requiresApproval,
        completedAt: new Date().toISOString()
      }
      await agentRunRepository.create(agentRecord, { actor, skipAudit: true })
      agentRunIds.push(agentRunId)

      const safetyRecord: FounderSafetyReviewRecord = {
        id: nextId('safety'),
        ...baseTimestamps(actor, 'staff-team'),
        status: safety.safe ? 'passed' : safety.requiresReview ? 'flagged' : 'blocked',
        targetEntityType: 'agent_run',
        targetEntityId: agentRunId,
        issues: safety.issues,
        safe: safety.safe,
        requiresReview: safety.requiresReview,
        redactedExcerpt: safety.redactedContent.slice(0, 280)
      }
      await safetyReviewRepository.persistReview(safetyRecord, actor)
      safetyReviewIds.push(safetyRecord.id)
    }

    const completed = await staffTeamRunRepository.markComplete(
      runId,
      {
        agentRunIds,
        safetyReviewIds,
        actionsGenerated: input.actionsGenerated,
        draftsGenerated: input.draftsGenerated,
        briefsGenerated: input.briefsGenerated,
        approvalsQueued: input.approvalsQueued,
        summary: input.summary
      },
      actor
    )
    return completed ?? { ...runRecord, status: 'complete', completedAt: new Date().toISOString(), agentRunIds, safetyReviewIds }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Staff team run failed'
    const safeSummary = message.slice(0, 240)
    await staffTeamRunRepository.markFailed(runId, safeSummary, actor)
    return { ...runRecord, status: 'failed', errorSummary: safeSummary, agentRunIds, safetyReviewIds }
  }
}
