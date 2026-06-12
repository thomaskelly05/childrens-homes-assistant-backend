import { getAutonomySettings } from './founder-autonomous-loop'
import { recordAgentAuditEntry } from './founder-agent-audit'
import { queueApprovalFromRecommendation } from './founder-agent-actions'
import type { FounderAgentEvent } from './founder-agent-event-types'
import {
  addFounderAgentRecommendation,
  getFounderAgentEvents,
  getFounderAgentRecommendations,
  updateFounderAgentEvent
} from './founder-agent-event-store'
import { routeEventToAgents } from './founder-agent-router'
import {
  generateRecommendationForAgent,
  shouldCreateDraftPrForFailure
} from './founder-agent-recommendation-engine'
import { handleAutonomyEvent } from './founder-autonomous-loop'

export type ProcessEventResult = {
  event: FounderAgentEvent
  recommendations: ReturnType<typeof addFounderAgentRecommendation>[]
  approvalItemIds: string[]
}

export function processFounderAgentEvent(event: FounderAgentEvent): ProcessEventResult {
  const agentIds = event.affectedAgents.length > 0 ? event.affectedAgents : routeEventToAgents(event.type)
  const recommendations: ReturnType<typeof addFounderAgentRecommendation>[] = []
  const approvalItemIds: string[] = []

  const receiveAudit = recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `Event received: ${event.type} — ${event.title}`,
    approvalStatus: 'not_required',
    relatedRunId: event.relatedRunId
  })

  recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `Agents notified: ${agentIds.join(', ')}`,
    approvalStatus: 'not_required',
    relatedRunId: event.relatedRunId
  })

  for (const agentId of agentIds) {
    const draft = generateRecommendationForAgent(event, agentId)
    if (!draft) continue

    const rec = addFounderAgentRecommendation({
      eventId: event.id,
      agentId,
      createdAt: new Date().toISOString(),
      recommendation: draft.recommendation,
      rationale: draft.rationale,
      riskLevel: draft.riskLevel,
      proposedAction: draft.proposedAction,
      approvalRequired: draft.approvalRequired
    })

    const recAudit = recordAgentAuditEntry({
      agentId,
      actionType: draft.proposedAction,
      summary: `Recommendation created: ${draft.recommendation}`,
      approvalStatus: draft.approvalRequired ? 'pending' : 'not_required',
      relatedRunId: event.relatedRunId
    })

    rec.auditRecordId = recAudit.id

    if (draft.approvalRequired) {
      const approvalItem = queueApprovalFromRecommendation({
        agentId,
        eventId: event.id,
        actionType: draft.proposedAction,
        title: `${event.title} — ${agentId}`,
        summary: draft.recommendation,
        rationale: draft.rationale,
        riskLevel: draft.riskLevel,
        safetyNotes: buildSafetyNotes(event, draft.proposedAction)
      })
      if (approvalItem) {
        rec.approvalItemId = approvalItem.id
        approvalItemIds.push(approvalItem.id)
      }
    }

    recommendations.push(rec)
  }

  const settings = getAutonomySettings()
  if (shouldCreateDraftPrForFailure(event) && settings.autoCreateDraftPR) {
    const prDraft = generateRecommendationForAgent(event, 'orb-quality-agent')
    if (prDraft) {
      const prRec = addFounderAgentRecommendation({
        eventId: event.id,
        agentId: 'orb-quality-agent',
        createdAt: new Date().toISOString(),
        recommendation: 'Draft PR summary auto-prepared — no auto-merge.',
        rationale: 'autoCreateDraftPR enabled. Tom must approve before GitHub.',
        riskLevel: 'high',
        proposedAction: 'create_draft_pr_summary',
        approvalRequired: true
      })
      const approvalItem = queueApprovalFromRecommendation({
        agentId: 'orb-quality-agent',
        eventId: event.id,
        actionType: 'create_draft_pr_summary',
        title: `Draft PR for ${event.relatedRunId ?? event.id}`,
        summary: prRec.recommendation,
        rationale: prRec.rationale,
        riskLevel: 'high',
        safetyNotes: 'Auto-merge blocked. Founder approval required.'
      })
      if (approvalItem) {
        prRec.approvalItemId = approvalItem.id
        approvalItemIds.push(approvalItem.id)
      }
      recommendations.push(prRec)
    }
  }

  handleAutonomyEvent(event)

  const updated = updateFounderAgentEvent(event.id, {
    processed: true,
    processedAt: new Date().toISOString(),
    resultingRecommendations: recommendations.map((r) => r.id),
    auditRecordId: receiveAudit.id,
    affectedAgents: agentIds
  })

  return {
    event: updated ?? event,
    recommendations,
    approvalItemIds
  }
}

function buildSafetyNotes(
  event: FounderAgentEvent,
  action: string
): string {
  const notes = ['Tom remains the approval gate.']
  if (['draft_linkedin_post', 'draft_founder_update'].includes(action)) {
    notes.push('Cannot auto-publish.')
  }
  if (['draft_provider_email', 'draft_partner_follow_up'].includes(action)) {
    notes.push('Cannot auto-send external messages.')
  }
  if (action === 'create_draft_pr_summary') {
    notes.push('Cannot auto-merge PRs.')
  }
  if (event.type === 'launch_gate_blocked') {
    notes.push('Do not override launch gates.')
  }
  notes.push('No real child data in payloads.')
  return notes.join(' ')
}

export function getLiveEventFeed(limit = 20): FounderAgentEvent[] {
  return getFounderAgentEvents(limit)
}

export function getAgentRecommendationsGrouped() {
  const recs = getFounderAgentRecommendations()
  const grouped: Record<string, typeof recs> = {}
  for (const rec of recs) {
    grouped[rec.agentId] = grouped[rec.agentId] ?? []
    grouped[rec.agentId].push(rec)
  }
  return grouped
}
