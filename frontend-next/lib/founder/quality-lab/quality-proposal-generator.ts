import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { addBuildBrief } from '@/lib/founder/build-briefs/build-brief-store'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import type { OrbAdminFeedbackSummary } from '@/lib/orb/admin-quality-client'
import type { QualityProposal, QualityRun, QualityRunItemResult } from './quality-lab-types'
import { addQualityProposal, getQualityProposal, updateQualityProposalStatus } from './quality-proposal-store'

function priorityFromResult(item: QualityRunItemResult): QualityProposal['priority'] {
  if (item.unsafePhrases.length > 0) return 'critical'
  if (item.riskLevel === 'critical' || item.riskLevel === 'high') return 'high'
  if (item.missingMarkers.length >= 3) return 'high'
  if (item.missingMarkers.length > 0) return 'medium'
  return 'low'
}

function proposalFromFailedItem(run: QualityRun, item: QualityRunItemResult): QualityProposal | null {
  if (item.passed) return null

  const type =
    item.liveCallError || item.criticalFailure
      ? 'live-llm-failure'
      : item.unsafePhrases.length > 0
        ? 'unsafe-pattern'
        : 'marker-gap'
  const title =
    type === 'unsafe-pattern'
      ? `Unsafe pattern in ${item.scenarioTitle}`
      : `Missing markers in ${item.scenarioTitle}`

  const description =
    type === 'unsafe-pattern'
      ? `Scenario ${item.scenarioId} failed with unsafe phrases: ${item.unsafePhrases.join(', ')}.`
      : `Scenario ${item.scenarioId} is missing expected markers: ${item.missingMarkers.slice(0, 4).join(', ')}.`

  return addQualityProposal({
    title,
    description,
    type,
    priority: priorityFromResult(item),
    sourceRunId: run.id,
    sourceScenarioId: item.scenarioId,
    affectedFamily: item.family,
    suggestedChange:
      type === 'unsafe-pattern'
        ? 'Strengthen ORB answer guardrails and prompt blocks for this scenario family.'
        : 'Add expert markers and self-check coverage for this scenario family in the ORB brain.',
    acceptanceCriteria: [
      'Re-run gold scenario pack and confirm pass',
      'No unsafe phrase patterns in evaluator output',
      'Missing markers reduced or documented as intentional'
    ],
    createdBy: 'orb-quality-agent'
  })
}

export function generateProposalsFromRun(run: QualityRun): QualityProposal[] {
  const created: QualityProposal[] = []
  for (const item of run.results) {
    const proposal = proposalFromFailedItem(run, item)
    if (proposal) created.push(proposal)
  }
  return created
}

export function generateProposalsFromFeedbackSummary(summary: OrbAdminFeedbackSummary): QualityProposal[] {
  const created: QualityProposal[] = []
  for (const gap of summary.recurring_gaps ?? []) {
    created.push(
      addQualityProposal({
        title: `Live feedback gap: ${gap.gap}`,
        description: `${gap.count} downvote(s) linked to this gap across live ORB feedback.`,
        type: 'feedback-gap',
        priority: gap.count >= 5 ? 'high' : 'medium',
        affectedFamily: gap.affected_families?.[0],
        suggestedChange: gap.suggested_action || 'Review ORB prompts and expert markers for this gap.',
        acceptanceCriteria: [
          'Downvote rate for this gap reduces in next quality review period',
          'Improvement candidate or build brief created if pattern persists'
        ],
        createdBy: 'orb-quality-agent'
      })
    )
  }
  return created
}

export function createBuildBriefFromProposal(proposalId: string): { briefId: string } | null {
  const item = getQualityProposal(proposalId)
  if (!item) return null

  const cursorPrompt = `ORB Quality Lab proposal

Title: ${item.title}

Problem: ${item.description}

Suggested change: ${item.suggestedChange}

Acceptance criteria:
${item.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Scenario: ${item.sourceScenarioId ?? 'n/a'}
Family: ${item.affectedFamily ?? 'n/a'}

Safety:
- No live OS record claims in standalone ORB
- British English, children's homes terminology
- Founder guard on any new routes`

  const safety = checkFounderOutputSafety(cursorPrompt)
  const brief = addBuildBrief({
    title: item.title,
    priority: item.priority === 'critical' ? 'critical' : item.priority,
    createdBy: 'orb-quality-agent',
    problem: item.description,
    goal: item.suggestedChange,
    phases: ['Review failed scenario output', 'Update ORB brain/prompt coverage', 'Re-run quality lab pack'],
    filesLikelyAffected: [
      'services/orb_expert_answer_engine_service.py',
      'assistant/knowledge/orb_expert_scenarios.py',
      'services/orb_answer_quality_gate_service.py'
    ],
    acceptanceCriteria: item.acceptanceCriteria,
    testPlan: ['pytest tests/test_orb_expert_scenario_evaluator.py', 'Run Quality Lab gold pack from /founder/quality-lab'],
    safetyNotes: safety.issues.map((i) => i.message),
    cursorPrompt: safety.redactedContent
  })

  const approval = createApprovalItem({
    type: 'technical-build-brief',
    title: brief.title,
    content: brief.cursorPrompt,
    requestedByAgent: 'orb-quality-agent',
    riskLevel: item.priority === 'critical' ? 'high' : 'medium',
    safetyCheck: safety.issues.map((i) => i.message).join('; ') || 'Passed safety check'
  })

  updateQualityProposalStatus(proposalId, 'sent-to-cursor', {
    linkedBuildBriefId: brief.id,
    linkedApprovalId: approval.id
  })

  return { briefId: brief.id }
}
