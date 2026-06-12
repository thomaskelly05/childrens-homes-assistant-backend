/**
 * Routes weakness signals from autonomous checks into Learning Loop proposals and approval queue.
 */

import { addApprovalItem } from '../approvals/approval-store.ts'
import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'
import { addFounderAgentEvent } from '../agents/autonomous/founder-agent-event-store.ts'
import { createLearningProposal } from './learning-loop-proposal-generator.ts'
import {
  addLoop,
  addProposal,
  addWeakness,
  getAllProposals,
  getProposal,
  nextLoopId,
  nextWeaknessId,
  recordLearningAudit,
  updateLoop,
  updateProposal
} from './learning-loop-store.ts'
import type {
  DetectedWeakness,
  LearningLoopTriggerType,
  LearningProposal,
  LearningProposalSafetyRisk,
  LearningWeaknessArea
} from './learning-loop-types.ts'

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

export type WeaknessSignalInput = {
  source: 'micro-check' | 'focused-check' | 'nightly_benchmark' | 'weekly_audit'
  runId: string
  taskId?: string
  area: string
  category: string
  marker: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  recommendedAction: string
  repeatedMarkerCount?: number
}

export type WeaknessSignalResult = {
  weaknessDetected: boolean
  message: string
  proposalId?: string
  approvalItemId?: string
  loopId?: string
  createdNewProposal: boolean
}

function mapArea(area: string): LearningWeaknessArea {
  const normalised = area.toLowerCase()
  if (normalised.includes('safeguard')) return 'safeguarding'
  if (normalised.includes('scor')) return 'scoring'
  if (normalised.includes('coverage') || normalised.includes('gap')) return 'coverage'
  if (normalised.includes('fallback')) return 'fallback'
  if (normalised.includes('routing')) return 'routing'
  if (normalised.includes('govern')) return 'governance'
  if (normalised.includes('product') || normalised.includes('practice')) return 'product_practice'
  return 'prompt_scaffold'
}

function findRecentProposal(area: string, marker: string, category: string): LearningProposal | undefined {
  const cutoff = Date.now() - DEDUP_WINDOW_MS

  return getAllProposals().find((proposal) => {
    if (proposal.status === 'rejected') return false
    const created = new Date(proposal.createdAt).getTime()
    if (created < cutoff) return false
    const haystack = `${proposal.whatBrainShouldLearn} ${proposal.evidenceSummary} ${proposal.changeType}`.toLowerCase()
    return (
      haystack.includes(marker.toLowerCase()) &&
      (haystack.includes(area.toLowerCase()) || haystack.includes(category.toLowerCase()))
    )
  })
}

function derivePriority(
  severity: WeaknessSignalInput['severity'],
  repeatedMarkerCount = 1
): LearningProposalSafetyRisk {
  if (severity === 'critical') return 'critical'
  if (severity === 'high' || repeatedMarkerCount >= 3) return 'high'
  if (severity === 'medium' || repeatedMarkerCount >= 2) return 'medium'
  return 'low'
}

function toDetectedWeakness(signal: WeaknessSignalInput): DetectedWeakness {
  return {
    id: nextWeaknessId(),
    area: mapArea(signal.area),
    category: signal.category,
    severity: signal.severity,
    evidence: [signal.marker, `run:${signal.runId}`, `source:${signal.source}`],
    affectedScenarios: [signal.runId],
    likelyRootCause: `Weak marker detected during ${signal.source.replace(/-/g, ' ')}`,
    recommendedAction: signal.recommendedAction,
    approvalRequired: true
  }
}

function createApprovalForProposal(proposal: LearningProposal, signal: WeaknessSignalInput): string {
  const agentLabel =
    signal.area.toLowerCase().includes('safeguard') ? 'Safeguarding Agent' : 'Learning Loop / Quality Agent'

  const item = addApprovalItem({
    type: 'technical-build-brief',
    title: `Learning proposal: ${proposal.whatBrainShouldLearn.slice(0, 80)}`,
    content: [
      `Agent: ${agentLabel}`,
      `Affected area: ${signal.area}`,
      `Weak marker: ${signal.marker}`,
      `Risk level: ${proposal.safetyRisk}`,
      `Recommended action: ${signal.recommendedAction}`,
      '',
      'Why it matters in residential childcare:',
      proposal.whyItMatters,
      '',
      'Proposed internal brain improvement:',
      proposal.whatBrainShouldLearn,
      '',
      'Tests required:',
      ...proposal.testsRequired.map((t) => `• ${t}`),
      '',
      'Safety constraints:',
      ...proposal.manualVerificationChecklist.map((c) => `• ${c}`),
      '',
      'Actions: Approve build brief · Reject · Request changes',
      `Proposal ID: ${proposal.id}`
    ].join('\n'),
    requestedByAgent: agentLabel,
    riskLevel: proposal.safetyRisk === 'critical' || proposal.safetyRisk === 'high' ? 'high' : 'medium',
    safetyCheck: 'Learning loop proposal — Tom approval required before brain changes.'
  })

  return item.id
}

export function signalWeaknessFromCheck(signal: WeaknessSignalInput): WeaknessSignalResult {
  const weakness = toDetectedWeakness(signal)
  addWeakness(weakness)

  const triggerMap: Record<WeaknessSignalInput['source'], LearningLoopTriggerType> = {
    'micro-check': 'repeated_weak_marker',
    'focused-check': 'coverage_gap',
    'nightly_benchmark': 'low_pass_rate',
    'weekly_audit': 'coverage_gap'
  }

  const existing = findRecentProposal(signal.area, signal.marker, signal.category)
  if (existing) {
    const appendedEvidence = `${existing.evidenceSummary}; ${signal.marker} (${signal.runId})`.slice(0, 800)
    const priority = derivePriority(signal.severity, signal.repeatedMarkerCount ?? 1)
    updateProposal(existing.id, {
      evidenceSummary: appendedEvidence,
      safetyRisk: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : existing.safetyRisk
    })

    recordLearningAudit({
      loopId: existing.loopId,
      action: 'weakness_detected',
      summary: `Appended evidence to existing proposal ${existing.id} from ${signal.source}`,
      actor: 'autonomous-scheduler',
      relatedIds: [existing.id, signal.runId]
    })

    recordAgentAuditEntry({
      agentId: 'orb-quality-agent',
      actionType: 'create_audit_note',
      summary: `Learning loop signal: updated proposal ${existing.id} with new ${signal.source} evidence.`,
      approvalStatus: 'pending',
      relatedRunId: signal.runId
    })

    return {
      weaknessDetected: true,
      message: `Updated existing learning proposal with new evidence from ${signal.source}.`,
      proposalId: existing.id,
      createdNewProposal: false,
      loopId: existing.loopId
    }
  }

  const loop = {
    id: nextLoopId(),
    createdAt: new Date().toISOString(),
    triggerType: triggerMap[signal.source],
    sourceRunId: signal.runId,
    status: 'proposing_improvement' as const,
    affectedAreas: [signal.area],
    weakMarkers: [signal.marker],
    scenarioCategories: [signal.category],
    evidenceSummary: `${signal.marker} detected in ${signal.source} run ${signal.runId}`,
    approvalRequired: true,
    auditRecordIds: [],
    weaknessIds: [weakness.id],
    proposalIds: [],
    scenarioIds: []
  }
  addLoop(loop)

  const startAudit = recordLearningAudit({
    loopId: loop.id,
    action: 'loop_started',
    summary: `Learning loop started from ${signal.source}`,
    actor: 'autonomous-scheduler'
  })
  updateLoop(loop.id, { auditRecordIds: [startAudit.id] })

  const proposalResult = createLearningProposal({
    loopId: loop.id,
    weaknesses: [weakness],
    evidenceSummary: `${signal.marker} detected in ${signal.source} run ${signal.runId}`
  })

  if ('rejected' in proposalResult) {
    return {
      weaknessDetected: true,
      message: proposalResult.reason,
      loopId: loop.id,
      createdNewProposal: false
    }
  }

  const priority = derivePriority(signal.severity, signal.repeatedMarkerCount ?? 1)
  const proposal: LearningProposal = {
    ...proposalResult,
    safetyRisk: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : proposalResult.safetyRisk
  }
  addProposal(proposal)
  updateLoop(loop.id, {
    status: 'awaiting_approval',
    proposalIds: [proposal.id],
    proposedLearning: proposal.whatBrainShouldLearn
  })

  let approvalItemId: string | undefined
  if (proposal.safetyRisk === 'high' || proposal.safetyRisk === 'critical' || proposal.safetyRisk === 'medium') {
    approvalItemId = createApprovalForProposal(proposal, signal)
  }

  addFounderAgentEvent({
    type: 'scenario_generation_recommended',
    severity: proposal.safetyRisk === 'critical' ? 'critical' : 'medium',
    source: 'orb_evaluation',
    createdAt: new Date().toISOString(),
    title: 'Learning Loop proposal awaiting Tom approval',
    summary: proposal.whatBrainShouldLearn.slice(0, 160),
    relatedRunId: signal.runId,
    affectedAgents: ['orb-quality-agent', 'founder-chief-of-staff'],
    payload: { proposalId: proposal.id, syntheticOnly: true, approvalRequired: true },
    requiresReview: true
  })

  recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'create_audit_note',
    summary: `Learning loop proposal ${proposal.id} created from ${signal.source}. Tom approval required.`,
    approvalStatus: 'pending',
    relatedRunId: signal.runId
  })

  recordLearningAudit({
    loopId: loop.id,
    action: 'proposal_created',
    summary: `Proposal ${proposal.id} from ${signal.source}`,
    actor: 'autonomous-scheduler',
    relatedIds: [proposal.id, signal.runId]
  })

  return {
    weaknessDetected: true,
    message: `Created learning proposal from ${signal.source} weakness.`,
    proposalId: proposal.id,
    approvalItemId,
    loopId: loop.id,
    createdNewProposal: true
  }
}

export function getProposalForApprovalTest(proposalId: string): LearningProposal | undefined {
  return getProposal(proposalId)
}
