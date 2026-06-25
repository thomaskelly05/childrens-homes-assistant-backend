import type { BuildBrief } from '@/lib/indicare-lab/types'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'
import { REVIEW_SOURCE_LABELS, REVIEW_TASK_TYPE_LABELS } from '@/lib/indicare-lab/review-events/types'

export function generateBuildBriefFromReviewEvent(event: ReviewEvent): BuildBrief {
  const flaggedAgents = event.agentResults.filter((r) => r.flags.length > 0)
  const id = `brief-rev-${Date.now()}`
  const createdAt = new Date().toISOString()
  const sourceLabel = REVIEW_SOURCE_LABELS[event.source]
  const taskLabel = REVIEW_TASK_TYPE_LABELS[event.taskType]

  return {
    id,
    createdAt,
    title: `Build brief: Review event ${event.id} (${taskLabel})`,
    gaps: [],
    objective: `Address review flags from ${sourceLabel} ${taskLabel} internal evaluation. Status: ${event.status}. ${event.reasonSummary}`,
    scope: flaggedAgents.map(
      (agent) => `[${agent.agentLabel}] ${agent.flags.join('; ')} — ${agent.recommendation}`
    ),
    constraints: [
      'Development mode only — no production deployment without founder approval',
      'Must not silently alter system prompts or production brain behaviour',
      'Synthetic review board perspectives are AI-modelled, not human expert validation',
      'Language must use supports, reviews, flags, recommends — not compliance guarantees'
    ],
    acceptanceCriteria: flaggedAgents.map(
      (agent) => `${agent.agentLabel}: resolve flagged issue and re-run internal review test`
    ),
    riskNotes: `Review event risk: ${event.riskLevel}. Agents blocked: ${event.agentsBlocked}, rewrite: ${event.agentsRewrote}. Founder review required before any production integration.`
  }
}

export function reviewEventToApprovalItem(event: ReviewEvent) {
  return {
    id: `appr-rev-${event.id}`,
    title: `Review event: ${REVIEW_TASK_TYPE_LABELS[event.taskType]}`,
    type: `Review event · ${REVIEW_SOURCE_LABELS[event.source]}`,
    submittedAt: event.createdAt,
    riskLevel: event.riskLevel,
    status: 'pending' as const,
    summary: event.reasonSummary,
    evidence: event.agentResults
      .filter((r) => r.flags.length > 0)
      .map((r) => `${r.agentLabel}: ${r.flags[0]}`)
  }
}
