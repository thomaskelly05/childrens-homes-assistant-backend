import { getPendingApprovals } from '@/lib/founder/approvals/approval-store'
import { getLatestLiveQualityRun, getQualityRuns } from '@/lib/founder/quality-lab/quality-run-store'
import { getEvaluationRuns } from '@/lib/orb/evaluation/orb-evaluation-store'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'
import { findLatestFailedRun } from '@/lib/orb/quality-agent/orb-quality-agent-service'

import { getLearningLoopChiefOfStaffPriorities } from '../../learning-loop/learning-loop-agent-integration.ts'
import { getAwaitingApprovalScenarios } from '../../learning-loop/learning-loop-benchmark-bank.ts'
import { getAllWeaknesses, getPendingProposals } from '../../learning-loop/learning-loop-store.ts'

import { getPendingAgentApprovals } from './founder-agent-actions'
import { recordAgentAuditEntry } from './founder-agent-audit'
import { buildFounderCoverageMap } from './founder-agent-coverage-map'
import { getFounderAgentEvents } from './founder-agent-event-store'
import type { FounderAgentContext, FounderChiefOfStaffBrief } from './founder-agent-types'

function prioritise(items: string[], max = 5): string[] {
  return items.filter(Boolean).slice(0, max)
}

export function generateFounderChiefOfStaffBrief(context: FounderAgentContext = {}): FounderChiefOfStaffBrief {
  const qualityRuns = context.qualityRuns ?? getQualityRuns()
  const evaluationRuns = context.evaluationRuns ?? getEvaluationRuns()
  const latestLive = qualityRuns.find((r) => r.runMode === 'live-llm' && r.status === 'complete') ?? getLatestLiveQualityRun()
  const latestFailed = findLatestFailedRun(evaluationRuns)

  const launchGate = computeOrbLaunchQualityGate({
    runs: qualityRuns,
    evaluationRuns,
    whistleblowingCovered: context.whistleblowingCovered ?? true,
    privacyRetentionReviewed: context.privacyRetentionReviewed ?? false
  })

  const coverage = buildFounderCoverageMap({ qualityRuns, evaluationRuns })
  const pendingAgentApprovals = getPendingAgentApprovals()
  const pendingFounderApprovals = getPendingApprovals()

  const whatChanged: string[] = []
  if (latestLive) {
    whatChanged.push(
      `Latest Quality Lab live run: ${latestLive.passRate}% pass rate, ${latestLive.criticalFailures ?? 0} critical failure(s).`
    )
  }
  if (latestFailed) {
    whatChanged.push(`Latest failed evaluation run: ${latestFailed.id} (${latestFailed.packType ?? 'unknown pack'}).`)
  }
  if (coverage.weakAreas.length > 0) {
    whatChanged.push(`Coverage map: ${coverage.weakAreas.length} weak area(s) identified.`)
  }

  const whatIsBlocked = [...launchGate.blockers]
  if (!context.privacyRetentionReviewed) {
    whatIsBlocked.push('Privacy and retention review not recorded.')
  }

  const whatNeedsApproval = [
    ...pendingAgentApprovals.map((a) => `${a.title} (${a.riskLevel} risk)`),
    ...pendingFounderApprovals.map((a) => `${a.title} — ${a.type}`)
  ]

  const whatIsRisky: string[] = []
  if ((latestLive?.criticalFailures ?? 0) > 0) {
    whatIsRisky.push(`Quality Lab live pack has ${latestLive?.criticalFailures} critical failure(s).`)
  }
  if ((latestFailed?.criticalFailures ?? 0) > 0) {
    whatIsRisky.push(`High-risk evaluation run has ${latestFailed?.criticalFailures} critical failure(s).`)
  }
  if (coverage.overallStrength === 'weak' || coverage.overallStrength === 'untested') {
    whatIsRisky.push(`Coverage strength is ${coverage.overallStrength}.`)
  }

  const whatShouldBeTestedNext: string[] = []
  if ((latestLive?.criticalFailures ?? 0) > 0) {
    whatShouldBeTestedNext.push('Retest failed high-risk scenarios after fix.')
  } else if (!latestLive) {
    whatShouldBeTestedNext.push('Run high-risk live pack in Quality Lab.')
  }
  if (coverage.untestedAreas.length > 0) {
    whatShouldBeTestedNext.push(
      `Add scenarios for untested areas: ${coverage.untestedAreas.slice(0, 3).map((id) => id.replace(/_/g, ' ')).join(', ')}.`
    )
  }
  if ((latestLive?.criticalFailures ?? 0) === 0 && latestLive) {
    whatShouldBeTestedNext.push('GOLD live run recommended after high-risk is clean.')
  }

  const prsAwaitingReview = pendingAgentApprovals
    .filter((a) => a.actionType === 'create_draft_pr_summary')
    .map((a) => a.title)

  const commercialRelationshipActionsWaiting = pendingAgentApprovals
    .filter((a) =>
      ['draft_provider_email', 'draft_partner_follow_up', 'draft_linkedin_post', 'draft_founder_update'].includes(
        a.actionType
      )
    )
    .map((a) => a.title)

  const liveEvents = getFounderAgentEvents(20)
  const unprocessedHighSeverity = liveEvents.filter(
    (e) => !e.processed && (e.severity === 'critical' || e.severity === 'high')
  )
  const blockersFromEvents = liveEvents
    .filter((e) => e.type === 'launch_gate_blocked' || e.type === 'privacy_review_missing')
    .map((e) => e.title)
  const testsRecommended = liveEvents
    .filter((e) =>
      ['evaluation_run_failed', 'critical_failure_detected', 'deploy_completed', 'gold_run_missing'].includes(e.type)
    )
    .map((e) => e.summary)
    .slice(0, 5)

  const priorityCandidates: string[] = []

  for (const event of liveEvents.filter((e) => e.requiresReview).slice(0, 3)) {
    priorityCandidates.push(`[${event.severity}] ${event.title}`)
  }

  if (unprocessedHighSeverity.length > 0) {
    priorityCandidates.push(`${unprocessedHighSeverity.length} high-severity live event(s) awaiting review.`)
  }

  if ((latestFailed?.criticalFailures ?? 0) > 0 || (latestLive?.criticalFailures ?? 0) > 0) {
    const criticalCount = Math.max(latestFailed?.criticalFailures ?? 0, latestLive?.criticalFailures ?? 0)
    priorityCandidates.push(
      `High-risk live pack still has ${criticalCount} critical. Quality Agent recommends PR.`
    )
  }

  if (!context.privacyRetentionReviewed) {
    priorityCandidates.push('Privacy and retention review not recorded. Governance Agent recommends completion.')
  }

  if ((latestLive?.criticalFailures ?? 0) === 0 && !latestLive) {
    priorityCandidates.push('GOLD live run not completed. Quality Lab recommends running after high-risk is clean.')
  } else if ((latestLive?.criticalFailures ?? 0) === 0 && latestLive && launchGate.recommendation !== 'public-launch-ready') {
    priorityCandidates.push('GOLD live run not completed. Quality Lab recommends running after high-risk is clean.')
  }

  if (pendingAgentApprovals.length > 0) {
    priorityCandidates.push(`${pendingAgentApprovals.length} agent-prepared item(s) awaiting your approval.`)
  }

  if (launchGate.blockers.length > 0) {
    priorityCandidates.push(`Launch gate: ${launchGate.blockers[0]}`)
  }

  const learningLoopPriorities = getLearningLoopChiefOfStaffPriorities({
    pendingProposals: getPendingProposals().length,
    criticalWeaknesses: getAllWeaknesses().filter((w) => w.severity === 'critical').length,
    awaitingApprovalScenarios: getAwaitingApprovalScenarios().length
  })
  for (const lp of learningLoopPriorities) {
    priorityCandidates.push(lp)
  }

  const topPriorities = prioritise(priorityCandidates, 5)
  const liveEventPriorities = prioritise(
    liveEvents.slice(0, 5).map((e) => `${e.title} (${e.source})`),
    5
  )

  const brief: FounderChiefOfStaffBrief = {
    generatedAt: new Date().toISOString(),
    whatChanged: prioritise(whatChanged, 5),
    whatIsBlocked: prioritise(whatIsBlocked, 5),
    whatNeedsApproval: prioritise(whatNeedsApproval, 5),
    whatIsRisky: prioritise(whatIsRisky, 5),
    whatShouldBeTestedNext: prioritise(whatShouldBeTestedNext, 5),
    prsAwaitingReview: prioritise(prsAwaitingReview, 5),
    launchGateBlockers: prioritise(launchGate.blockers, 5),
    commercialRelationshipActionsWaiting: prioritise(commercialRelationshipActionsWaiting, 5),
    topPriorities,
    liveEventPriorities,
    blockersFromEvents: prioritise(blockersFromEvents, 5),
    testsRecommended: prioritise(testsRecommended, 5)
  }

  recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `Today's brief generated with ${topPriorities.length} top priorit${topPriorities.length === 1 ? 'y' : 'ies'}.`,
    approvalStatus: 'not_required'
  })

  return brief
}
