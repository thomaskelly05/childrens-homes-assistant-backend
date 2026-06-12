import { getEvaluationRuns } from '../../orb/evaluation/orb-evaluation-store.ts'
import { getQualityRuns } from '../quality-lab/quality-run-store.ts'

import { queueApprovalFromRecommendation } from '../agents/autonomous/founder-agent-actions'
import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit'

import type { LiveLlmApprovalItem, LiveLlmGateStatus, LiveLlmRecommendation } from './scheduler-types'

let approvalCounter = 0
let liveLlmApprovals: LiveLlmApprovalItem[] = []

function nextApprovalId(): string {
  approvalCounter += 1
  return `live-llm-approval-${Date.now()}-${approvalCounter}`
}

function latestInternalRun(packType: string) {
  return getEvaluationRuns().find(
    (r) => r.mode === 'internal-brain' && r.packType === packType && r.status === 'completed'
  )
}

function matchesPackType(
  packType: string,
  candidate: { packType?: string; type?: string; title?: string }
): boolean {
  if (candidate.packType === packType) return true
  if (packType === 'standard' && candidate.type === 'gold-pack') return true
  if (packType === 'adversarial' && (candidate.title?.toLowerCase().includes('adversarial') ?? false)) return true
  if (packType === 'high-risk' && (candidate.title?.toLowerCase().includes('high-risk') ?? false)) return true
  return false
}

function latestLiveRun(packType: string) {
  const qualityRuns = getQualityRuns()
  const evalRuns = getEvaluationRuns()
  const fromQuality = qualityRuns.find(
    (r) => r.runMode === 'live-llm' && matchesPackType(packType, r) && r.status === 'complete'
  )
  if (fromQuality) {
    const critical = fromQuality.criticalFailures ?? fromQuality.results?.filter((i) => i.criticalFailure).length ?? 0
    return { criticalFailures: critical, passed: critical === 0 }
  }
  const fromEval = evalRuns.find(
    (r) => r.mode === 'live-llm' && matchesPackType(packType, r) && r.status === 'completed'
  )
  if (fromEval) return { criticalFailures: fromEval.criticalFailures ?? 0, passed: (fromEval.criticalFailures ?? 0) === 0 }
  return null
}

function isApproved(recommendation: LiveLlmRecommendation): boolean {
  return liveLlmApprovals.some((a) => a.recommendation === recommendation && a.status === 'approved')
}

export function getLiveLlmGateStatus(): LiveLlmGateStatus {
  const internalAdversarial = latestInternalRun('adversarial')
  const internalHighRisk = latestInternalRun('high-risk')

  const internalAdversarialPassed =
    !!internalAdversarial && (internalAdversarial.criticalFailures ?? 0) === 0
  const internalHighRiskPassed =
    !!internalHighRisk && (internalHighRisk.criticalFailures ?? 0) === 0

  const liveAdversarial = latestLiveRun('adversarial')
  const liveHighRisk = latestLiveRun('high-risk')
  const liveGold = latestLiveRun('standard')

  const liveAdversarialApproved = isApproved('approve_live_adversarial')
  const liveHighRiskApproved = isApproved('approve_live_high_risk')
  const liveGoldApproved = isApproved('approve_live_gold')
  const expandedScenarioApproved = isApproved('approve_expanded_scenario')

  let currentRecommendation: LiveLlmGateStatus['currentRecommendation'] = null

  if (internalAdversarialPassed && internalHighRiskPassed && !liveAdversarial && !liveAdversarialApproved) {
    currentRecommendation = 'approve_live_adversarial'
  } else if (liveAdversarial?.passed && !liveHighRisk && !liveHighRiskApproved) {
    currentRecommendation = 'approve_live_high_risk'
  } else if (liveHighRisk?.passed && !liveGold && !liveGoldApproved) {
    currentRecommendation = 'approve_live_gold'
  }

  return {
    internalAdversarialPassed,
    internalHighRiskPassed,
    liveAdversarialApproved,
    liveAdversarialPassed: liveAdversarial?.passed ?? false,
    liveHighRiskApproved,
    liveHighRiskPassed: liveHighRisk?.passed ?? false,
    liveGoldApproved,
    liveGoldPassed: liveGold?.passed ?? false,
    expandedScenarioApproved,
    currentRecommendation,
    pendingApprovals: liveLlmApprovals.filter((a) => a.status === 'pending')
  }
}

const RECOMMENDATION_DETAILS: Record<
  LiveLlmRecommendation,
  { title: string; reason: string; expectedOutcome: string; estimatedCostGbp: number | null; estimatedRisk: LiveLlmApprovalItem['estimatedRisk']; safetyNotes: string }
> = {
  approve_live_adversarial: {
    title: 'Approve live adversarial run',
    reason: 'Internal adversarial and high-risk packs passed with 0 critical failures.',
    expectedOutcome: 'Validate adversarial scenarios against live LLM with real API costs.',
    estimatedCostGbp: 2.5,
    estimatedRisk: 'medium',
    safetyNotes: 'Synthetic scenarios only. No real child data. Tom must approve before execution.'
  },
  approve_live_high_risk: {
    title: 'Approve live high-risk run',
    reason: 'Live adversarial passed with 0 critical failures.',
    expectedOutcome: 'Validate high-risk safeguarding scenarios on live LLM.',
    estimatedCostGbp: 5.0,
    estimatedRisk: 'high',
    safetyNotes: 'High-risk safeguarding content. Approval required. No auto-run.'
  },
  approve_live_gold: {
    title: 'Approve live GOLD run',
    reason: 'Live high-risk passed with 0 critical failures.',
    expectedOutcome: 'Gold standard quality validation on live LLM.',
    estimatedCostGbp: 8.0,
    estimatedRisk: 'medium',
    safetyNotes: 'GOLD pack uses premium scenarios. Founder approval required.'
  },
  approve_expanded_scenario: {
    title: 'Approve expanded scenario run (1,000 pack)',
    reason: 'Explicit approval required for large scenario packs.',
    expectedOutcome: 'Run expanded scenario pack with significant API cost.',
    estimatedCostGbp: 150.0,
    estimatedRisk: 'critical',
    safetyNotes: '1,000 scenario pack requires explicit founder approval. Never auto-run.'
  }
}

export function recommendLiveLlmRun(recommendation: LiveLlmRecommendation, scenarioCount?: number): LiveLlmApprovalItem | null {
  const gate = getLiveLlmGateStatus()

  if (recommendation === 'approve_live_adversarial' && (!gate.internalAdversarialPassed || !gate.internalHighRiskPassed)) {
    return null
  }
  if (recommendation === 'approve_live_high_risk' && !gate.liveAdversarialPassed) {
    return null
  }
  if (recommendation === 'approve_live_gold' && !gate.liveHighRiskPassed) {
    return null
  }

  const existing = liveLlmApprovals.find((a) => a.recommendation === recommendation && a.status === 'pending')
  if (existing) return existing

  const details = RECOMMENDATION_DETAILS[recommendation]
  const item: LiveLlmApprovalItem = {
    id: nextApprovalId(),
    recommendation,
    title: details.title,
    reason: details.reason,
    previousGateStatus: JSON.stringify({
      internalAdversarial: gate.internalAdversarialPassed,
      internalHighRisk: gate.internalHighRiskPassed,
      liveAdversarial: gate.liveAdversarialPassed,
      liveHighRisk: gate.liveHighRiskPassed
    }),
    expectedOutcome: details.expectedOutcome,
    estimatedCostGbp: details.estimatedCostGbp,
    estimatedRisk: details.estimatedRisk,
    safetyNotes: details.safetyNotes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    scenarioCount
  }

  liveLlmApprovals.unshift(item)

  queueApprovalFromRecommendation({
    agentId: 'orb-quality-agent',
    eventId: item.id,
    actionType: 'run_synthetic_evaluation',
    title: item.title,
    summary: item.reason,
    rationale: item.expectedOutcome,
    riskLevel: item.estimatedRisk === 'critical' ? 'critical' : item.estimatedRisk === 'high' ? 'high' : 'medium',
    safetyNotes: item.safetyNotes,
    proposedPayload: { recommendation, scenarioCount, estimatedCostGbp: item.estimatedCostGbp }
  })

  recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'create_audit_note',
    summary: `Live LLM approval recommended: ${item.title}`,
    approvalStatus: 'pending',
    relatedEventId: item.id
  })

  return item
}

export function evaluateAndRecommendLiveLlmGates(): LiveLlmApprovalItem | null {
  const gate = getLiveLlmGateStatus()
  if (!gate.currentRecommendation) return null
  return recommendLiveLlmRun(gate.currentRecommendation)
}

export function approveLiveLlmRun(approvalId: string, actor: string): LiveLlmApprovalItem | undefined {
  const item = liveLlmApprovals.find((a) => a.id === approvalId)
  if (!item || item.status !== 'pending') return undefined

  item.status = 'approved'
  recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'approval_decision',
    summary: `Live LLM run approved by ${actor}: ${item.title}. Execution still requires manual trigger.`,
    approvalStatus: 'approved',
    relatedEventId: item.id,
    actor
  })
  return item
}

export function rejectLiveLlmRun(approvalId: string, actor: string): LiveLlmApprovalItem | undefined {
  const item = liveLlmApprovals.find((a) => a.id === approvalId)
  if (!item || item.status !== 'pending') return undefined

  item.status = 'rejected'
  recordAgentAuditEntry({
    agentId: 'orb-quality-agent',
    actionType: 'approval_decision',
    summary: `Live LLM run rejected by ${actor}: ${item.title}`,
    approvalStatus: 'rejected',
    relatedEventId: item.id,
    actor
  })
  return item
}

export function requiresApprovalForLiveLlm(scenarioCount: number): boolean {
  if (scenarioCount >= 1000) return true
  return true
}

export function canExecuteLiveLlmRun(recommendation: LiveLlmRecommendation): boolean {
  return isApproved(recommendation)
}

export function resetLiveLlmGate(): void {
  liveLlmApprovals = []
  approvalCounter = 0
}

export function getLiveLlmApprovals(): LiveLlmApprovalItem[] {
  return [...liveLlmApprovals]
}
