import { refreshFounderActions } from '@/lib/founder/actions'
import { getPendingApprovals } from '@/lib/founder/approvals'
import { generateBuildBriefFromCto } from '@/lib/founder/build-briefs'
import { generateLinkedInDraft } from '@/lib/founder/content'
import { hydrateFounderTelemetryFromLiveData } from '@/lib/founder/telemetry'
import { runStaffAgent, type FounderStaffAgentId } from '@/lib/founder/team'
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

  // 1. Pull live telemetry
  hydrateFounderTelemetryFromLiveData()
  steps.push({
    id: 'telemetry',
    agentId: 'telemetry',
    label: 'Pull live telemetry',
    status: 'complete',
    completedAt: new Date().toISOString()
  })

  // 2-10. Run agents in sequence
  for (const { id, label } of LOOP_AGENT_SEQUENCE) {
    steps.push({ id, agentId: id, label: `Run ${label}`, status: 'running' })
    runStaffAgent(id)
    const stepIndex = steps.findIndex((s) => s.id === id)
    if (stepIndex >= 0) {
      steps[stepIndex] = {
        ...steps[stepIndex],
        status: 'complete',
        completedAt: new Date().toISOString()
      }
    }
  }

  // 11. Generate actions
  const actions = refreshFounderActions()
  steps.push({
    id: 'actions',
    agentId: 'actions',
    label: 'Generate actions',
    status: 'complete',
    completedAt: new Date().toISOString()
  })

  // 12. Generate content drafts
  const linkedInDraft = generateLinkedInDraft('weekly-progress')
  steps.push({
    id: 'content',
    agentId: 'brand-ambassador',
    label: 'Generate content drafts',
    status: 'complete',
    completedAt: new Date().toISOString()
  })

  // 13. Generate build briefs
  const brief = generateBuildBriefFromCto()
  steps.push({
    id: 'build-briefs',
    agentId: 'lead-developer',
    label: 'Generate build briefs',
    status: 'complete',
    completedAt: new Date().toISOString()
  })

  // 14. External-facing items queued in approvals (done by content/brief generators)
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
    draftsGenerated: 1 + (linkedInDraft ? 0 : 0),
    briefsGenerated: 1,
    approvalsQueued: pendingApprovals.length,
    summary: chief.summary
  }

  return lastLoopResult
}
