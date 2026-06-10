/**
 * Founder Priority Engine — ranked top priorities from real persisted/live data.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { FounderPriority, FounderPriorityLevel } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'

const PRIORITY_ORDER: Record<FounderPriorityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

function sortPriorities(items: FounderPriority[]): FounderPriority[] {
  return [...items].sort((a, b) => {
    const levelDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
    if (levelDiff !== 0) return levelDiff
    return b.confidence - a.confidence
  })
}

export function generateFounderPriorities(sources: IntelligenceSourceBundle): FounderPriority[] {
  const priorities: FounderPriority[] = []

  for (const followUp of sources.relationships.followUps.slice(0, 3)) {
    const isHigh =
      followUp.relationship.priority === 'critical' || followUp.relationship.priority === 'high'
    priorities.push({
      id: nextId('priority'),
      title: `Follow up: ${followUp.relationship.organisation}`,
      summary: followUp.intelligence.followUpReason ?? followUp.relationship.nextAction,
      reason: isHigh
        ? 'High-priority provider or partner relationship needs attention.'
        : 'Scheduled follow-up is due.',
      priority: isHigh ? 'high' : 'medium',
      confidence: isHigh ? 0.85 : 0.7,
      category: 'relationships',
      linkedEntityType: 'relationship',
      linkedEntityId: followUp.relationship.id,
      recommendedAction: followUp.relationship.nextAction || 'Schedule a follow-up at /founder/relationships.'
    })
  }

  for (const pack of sources.evidence.needingApproval.slice(0, 2)) {
    priorities.push({
      id: nextId('priority'),
      title: `Approve evidence pack: ${pack.title}`,
      summary: `${pack.audience} pack awaiting approval before external use.`,
      reason: 'External evidence cannot be shared without founder approval.',
      priority: pack.audience === 'investor' ? 'high' : 'medium',
      confidence: 0.9,
      category: 'evidence',
      linkedEntityType: 'evidence_pack',
      linkedEntityId: pack.id,
      recommendedAction: 'Review and approve at /founder/evidence or /founder/approvals.'
    })
  }

  for (const proposal of sources.quality.openProposalsList
    .filter((p) => p.priority === 'critical')
    .slice(0, 2)) {
    priorities.push({
      id: nextId('priority'),
      title: `Review Quality Lab critical failure: ${proposal.title}`,
      summary: proposal.description.slice(0, 200),
      reason: 'Unresolved critical quality failures risk safeguarding and Ofsted defensibility.',
      priority: 'critical',
      confidence: 0.92,
      category: 'quality',
      linkedEntityType: 'quality_proposal',
      linkedEntityId: proposal.id,
      recommendedAction: 'Review at /founder/quality-lab and assign a build brief if needed.'
    })
  }

  if (sources.revenue.snapshot.source === 'unavailable') {
    priorities.push({
      id: nextId('priority'),
      title: 'Connect live billing source',
      summary: 'Revenue Intelligence cannot show live MRR or margin without billing data.',
      reason: 'Commercial and investor narratives require honest revenue visibility.',
      priority: 'high',
      confidence: 0.88,
      category: 'revenue',
      recommendedAction: 'Connect billing at /founder/revenue and verify data source status.'
    })
  }

  const unapprovedForecasts = sources.revenue.forecasts?.filter((f) => f.approvalStatus !== 'approved') ?? []
  if (unapprovedForecasts.length > 0) {
    priorities.push({
      id: nextId('priority'),
      title: 'Approve revenue forecast before external use',
      summary: `${unapprovedForecasts.length} forecast(s) are assumptions — not live billing truth.`,
      reason: 'Forecasts must be labelled as assumptions and approved before investor use.',
      priority: 'high',
      confidence: 0.86,
      category: 'revenue',
      linkedEntityType: 'revenue_forecast',
      linkedEntityId: unapprovedForecasts[0]?.id,
      recommendedAction: 'Review forecasts at /founder/revenue/forecast and queue for approval.'
    })
  }

  const draftBriefs = sources.buildBriefs.filter((b) => b.status === 'draft' || b.status === 'approved')
  if (draftBriefs.length > 0) {
    const brief = draftBriefs[0]!
    priorities.push({
      id: nextId('priority'),
      title: `Complete build brief: ${brief.title}`,
      summary: brief.goal.slice(0, 180),
      reason: 'Product delivery blocked until build brief is sent to Cursor or completed.',
      priority: 'medium',
      confidence: 0.75,
      category: 'product',
      linkedEntityType: 'build_brief',
      linkedEntityId: brief.id,
      recommendedAction: 'Review at /founder/build-briefs and send to Cursor when ready.'
    })
  }

  const daysSinceLoop =
    sources.operatingLoop?.completedAt
      ? (Date.now() - new Date(sources.operatingLoop.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

  if (!sources.operatingLoop || daysSinceLoop > 7) {
    priorities.push({
      id: nextId('priority'),
      title: 'Run operating loop',
      summary: sources.operatingLoop
        ? `Last run was ${Math.floor(daysSinceLoop)} days ago.`
        : 'No operating loop run recorded yet.',
      reason: 'Staff team synthesis keeps priorities, risks and actions current.',
      priority: daysSinceLoop > 14 ? 'high' : 'medium',
      confidence: 0.8,
      category: 'operations',
      recommendedAction: 'Run at /founder/operating-loop with approval-based autonomy.'
    })
  }

  for (const pilot of sources.relationships.pilotOpportunities.slice(0, 2)) {
    priorities.push({
      id: nextId('priority'),
      title: `Create pilot partner pack for ${pilot.relationship.organisation}`,
      summary: pilot.opportunity.title,
      reason: 'Active provider pilot opportunity — evidence pack accelerates commercial traction.',
      priority: 'high',
      confidence: 0.82,
      category: 'commercial',
      linkedEntityType: 'relationship',
      linkedEntityId: pilot.relationship.id,
      recommendedAction: 'Generate partnership evidence pack at /founder/evidence.'
    })
  }

  if (sources.approvals.pending.length > 8) {
    priorities.push({
      id: nextId('priority'),
      title: 'Clear approval backlog',
      summary: `${sources.approvals.pending.length} items awaiting founder review.`,
      reason: 'Approval blockage delays external communications and evidence use.',
      priority: 'high',
      confidence: 0.84,
      category: 'operations',
      recommendedAction: 'Review queue at /founder/approvals.'
    })
  }

  return sortPriorities(priorities).slice(0, 7)
}
