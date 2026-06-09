import { refreshFounderActions } from '@/lib/founder/actions'
import { getPendingApprovals } from '@/lib/founder/approvals'
import { generateBuildBriefFromCto } from '@/lib/founder/build-briefs'
import { generateLinkedInDraft } from '@/lib/founder/content'
import { operatingLoopRepository } from '@/lib/founder/persistence'
import type { FounderOperatingLoopRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { hydrateFounderTelemetryFromLiveData } from '@/lib/founder/telemetry'
import { runStaffAgent, type FounderStaffAgentId } from '@/lib/founder/team'
import { persistStaffTeamRun } from '@/lib/founder/team/staff-team-run-service'
import type { OperatingLoopResult, OperatingLoopStep } from './operating-loop-types'

const LOOP_AGENT_SEQUENCE: Array<{ id: FounderStaffAgentId; label: string }> = [
  { id: 'chief-of-staff', label: 'Chief of Staff' },
  { id: 'cto', label: 'CTO' },
  { id: 'product-director', label: 'Product Director' },
  { id: 'ofsted-regulation', label: 'Ofsted and Regulation' },
  { id: 'customer-success', label: 'Customer Success' },
  { id: 'growth', label: 'Growth' },
  { id: 'brand-ambassador', label: 'Brand Ambassador' },
  { id: 'finance-ai-cost', label: 'Finance and AI Cost' },
  { id: 'data-protection-safety', label: 'Data Protection and Safety' }
]

let lastLoopResult: OperatingLoopResult | null = null

export function getLastOperatingLoopResult(): OperatingLoopResult | null {
  return lastLoopResult
}

/**
 * Manual founder operating loop — no scheduled automation, no external posting.
 */
export async function runFounderOperatingLoop(): Promise<OperatingLoopResult> {
  const startedAt = new Date().toISOString()
  const steps: OperatingLoopStep[] = []
  const loopId = nextId('loop-run')
  const agentOutputs: Array<{
    agentId: FounderStaffAgentId
    output: ReturnType<typeof runStaffAgent>
  }> = []

  try {
    hydrateFounderTelemetryFromLiveData()
    steps.push({
      id: 'telemetry',
      agentId: 'telemetry',
      label: 'Pull live telemetry',
      status: 'complete',
      completedAt: new Date().toISOString()
    })

    for (const { id, label } of LOOP_AGENT_SEQUENCE) {
      steps.push({ id, agentId: id, label: `Run ${label}`, status: 'running' })
      const output = runStaffAgent(id)
      agentOutputs.push({ agentId: id, output })
      const stepIndex = steps.findIndex((s) => s.id === id)
      if (stepIndex >= 0) {
        steps[stepIndex] = {
          ...steps[stepIndex],
          status: 'complete',
          completedAt: new Date().toISOString()
        }
      }
    }

    const actions = refreshFounderActions()
    steps.push({
      id: 'actions',
      agentId: 'actions',
      label: 'Generate actions',
      status: 'complete',
      completedAt: new Date().toISOString()
    })

    const linkedInDraft = generateLinkedInDraft('weekly-progress')
    steps.push({
      id: 'content',
      agentId: 'brand-ambassador',
      label: 'Generate content drafts',
      status: 'complete',
      completedAt: new Date().toISOString()
    })

    const brief = generateBuildBriefFromCto()
    steps.push({
      id: 'build-briefs',
      agentId: 'lead-developer',
      label: 'Generate build briefs',
      status: 'complete',
      completedAt: new Date().toISOString()
    })

    const pendingApprovals = getPendingApprovals()
    steps.push({
      id: 'approvals',
      agentId: 'data-protection-safety',
      label: 'Queue external-facing approvals',
      status: 'complete',
      completedAt: new Date().toISOString()
    })

    const chief = runStaffAgent('chief-of-staff')
    const completedAt = new Date().toISOString()

    lastLoopResult = {
      startedAt,
      completedAt,
      steps,
      actionsGenerated: actions.length,
      draftsGenerated: linkedInDraft ? 1 : 0,
      briefsGenerated: brief ? 1 : 0,
      approvalsQueued: pendingApprovals.length,
      summary: chief.summary
    }

    const staffRun = await persistStaffTeamRun({
      agentOutputs,
      actionsGenerated: actions.length,
      draftsGenerated: linkedInDraft ? 1 : 0,
      briefsGenerated: brief ? 1 : 0,
      approvalsQueued: pendingApprovals.length,
      summary: chief.summary
    })

    const loopRecord: FounderOperatingLoopRunRecord = {
      id: loopId,
      ...baseTimestamps('founder', 'operating-loop'),
      status: 'complete',
      result: lastLoopResult,
      staffTeamRunId: staffRun.id
    }
    await operatingLoopRepository.persistResult(loopRecord)

    return lastLoopResult
  } catch (error) {
    const completedAt = new Date().toISOString()
    const safeSummary = (error instanceof Error ? error.message : 'Operating loop failed').slice(0, 240)
    lastLoopResult = {
      startedAt,
      completedAt,
      steps,
      actionsGenerated: 0,
      draftsGenerated: 0,
      briefsGenerated: 0,
      approvalsQueued: 0,
      summary: safeSummary
    }
    const loopRecord: FounderOperatingLoopRunRecord = {
      id: loopId,
      ...baseTimestamps('founder', 'operating-loop'),
      status: 'failed',
      result: lastLoopResult,
      errorSummary: safeSummary
    }
    await operatingLoopRepository.persistResult(loopRecord)
    return lastLoopResult
  }
}
