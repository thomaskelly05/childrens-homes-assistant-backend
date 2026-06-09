import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { runStaffAgent } from '@/lib/founder/team'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import type { BuildBrief } from './build-brief-types'
import { addBuildBrief } from './build-brief-store'

export function generateBuildBriefFromCto(): BuildBrief {
  const cto = runStaffAgent('cto')
  const leadDev = runStaffAgent('lead-developer')

  const cursorPrompt = `Build brief for IndiCare Intelligence

Problem: ${cto.findings[0] ?? 'Review technical priorities from live telemetry.'}

Goal: ${leadDev.recommendations[0] ?? 'Implement founder-approved technical improvement.'}

Phases:
${leadDev.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Files likely affected:
- frontend-next/lib/founder/
- frontend-next/components/founder/
- Relevant backend routes under app/ or api/

Acceptance criteria:
- Live-only data paths remain default
- No identifiable child, staff or provider data exposed
- Founder guard enforced on new routes
- British English, children's homes terminology

Safety:
- Never auto-post external content
- Route external drafts through approvals

Test plan:
- Run frontend-next typecheck
- Verify founder routes show empty states without live data
- Confirm safety checks on generated content`

  const safety = checkFounderOutputSafety(cursorPrompt)

  const brief = addBuildBrief({
    title: cto.actions[0] ?? 'Technical build priority from CTO Agent',
    priority: cto.risks.length > 0 ? 'high' : 'medium',
    createdBy: 'lead-developer',
    problem: cto.summary,
    goal: leadDev.summary,
    phases: leadDev.recommendations,
    filesLikelyAffected: [
      'frontend-next/lib/founder/',
      'frontend-next/components/founder/',
      'frontend-next/app/founder/'
    ],
    acceptanceCriteria: [
      'Live-only data remains default',
      'Founder guard on all new routes',
      'No mock business metrics in production'
    ],
    testPlan: ['npm run typecheck in frontend-next', 'Verify empty states without live data'],
    safetyNotes: safety.issues.map((i) => i.message),
    cursorPrompt: safety.redactedContent
  })

  createApprovalItem({
    type: 'technical-build-brief',
    title: brief.title,
    content: brief.cursorPrompt,
    requestedByAgent: 'lead-developer',
    riskLevel: 'low',
    safetyCheck: safety.issues.map((i) => i.message).join('; ') || 'Passed safety check'
  })

  return brief
}
