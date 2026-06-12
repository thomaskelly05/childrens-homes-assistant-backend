import type { FounderAgentId } from '../agents/autonomous/founder-agent-types.ts'

import type { DetectedWeakness, LearningAgentReview, LearningProposal } from './learning-loop-types.ts'

export function reviewLearningProposalWithAgents(proposal: LearningProposal): LearningAgentReview[] {
  const reviews: LearningAgentReview[] = []

  reviews.push({
    agentId: 'orb-quality-agent',
    summary: `Evaluation weakness detected: ${proposal.whatFailed.slice(0, 120)}. Recommends learning loop.`,
    riskFlags: proposal.safetyRisk === 'critical' ? ['critical evaluation gap'] : [],
    approved: false
  })

  if (proposal.safeguardingReviewRequired) {
    reviews.push({
      agentId: 'safeguarding-agent',
      summary:
        'Safeguarding learning proposal requires founder approval. Review escalation, child voice, and language risks.',
      riskFlags: ['escalation', 'child voice', 'language risk'],
      approved: false
    })
  }

  if (proposal.changeType !== 'benchmark_scenario_addition') {
    reviews.push({
      agentId: 'ofsted-regulation-agent',
      summary: 'Review regulatory orientation — do not invent law or regulation.',
      riskFlags: proposal.whatBrainShouldLearn.toLowerCase().includes('reg') ? ['regulatory accuracy'] : [],
      approved: false
    })
  }

  if (proposal.changeType === 'prompt_scaffold_update' || proposal.changeType === 'benchmark_scenario_addition') {
    reviews.push({
      agentId: 'product-agent',
      summary: 'Identify product/practice improvement opportunity for residential staff usability.',
      riskFlags: [],
      approved: false
    })
  }

  reviews.push({
    agentId: 'evidence-agent',
    summary: 'Record what changed and why in audit trail. Failed runs must remain visible.',
    riskFlags: [],
    approved: false
  })

  if (proposal.governanceReviewRequired) {
    reviews.push({
      agentId: 'governance-agent',
      summary: 'Check privacy, retention, and risk implications before brain change.',
      riskFlags: ['privacy', 'retention'],
      approved: false
    })
  }

  reviews.push({
    agentId: 'technical-agent',
    summary: `Technical implementation plan for ${proposal.changeType}. Smallest safe diff only.`,
    riskFlags: [],
    approved: false
  })

  return reviews
}

export function getLearningLoopChiefOfStaffPriorities(input: {
  pendingProposals: number
  criticalWeaknesses: number
  awaitingApprovalScenarios: number
}): string[] {
  const priorities: string[] = []

  if (input.criticalWeaknesses > 0) {
    priorities.push(
      `Learning Loop: ${input.criticalWeaknesses} critical weakness(es) detected — review safeguarding proposals.`
    )
  }

  if (input.pendingProposals > 0) {
    priorities.push(
      `Learning Loop: ${input.pendingProposals} learning proposal(s) awaiting Tom's approval.`
    )
  }

  if (input.awaitingApprovalScenarios > 0) {
    priorities.push(
      `Learning Loop: ${input.awaitingApprovalScenarios} synthetic scenario(s) awaiting benchmark approval.`
    )
  }

  return priorities.slice(0, 5)
}

export function recommendLearningLoopForWeakness(
  weakness: DetectedWeakness,
  agentId: FounderAgentId
): string | null {
  switch (agentId) {
    case 'orb-quality-agent':
      return `Detect evaluation weakness in ${weakness.category}: ${weakness.recommendedAction}`
    case 'safeguarding-agent':
      if (weakness.area === 'safeguarding') {
        return `Review safeguarding learning proposal for ${weakness.category} — escalation and child voice.`
      }
      return null
    case 'ofsted-regulation-agent':
      return weakness.category.toLowerCase().includes('reg')
        ? `Review regulatory orientation for ${weakness.category} — no invented law.`
        : null
    case 'product-agent':
      return weakness.area === 'product_practice'
        ? `Product/practice gap in ${weakness.category} — improve practical guidance.`
        : null
    case 'evidence-agent':
      return `Record learning loop evidence for ${weakness.category} weakness.`
    case 'governance-agent':
      return weakness.area === 'governance'
        ? `Governance review required for ${weakness.category} learning proposal.`
        : null
    case 'technical-agent':
      return `Prepare technical plan for ${weakness.recommendedAction}`
    case 'founder-chief-of-staff':
      return `Prioritise learning loop review: ${weakness.severity} ${weakness.category} weakness.`
    default:
      return null
  }
}

export function safeguardingProposalRequiresFounderApproval(proposal: LearningProposal): boolean {
  return proposal.safeguardingReviewRequired && proposal.approvalRequired === true
}
