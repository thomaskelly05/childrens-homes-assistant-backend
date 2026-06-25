import { getShadowReviewConfigSnapshot } from '@/lib/indicare-lab/review-events/review-event-config'
import type { ReviewEventSummary } from '@/lib/indicare-lab/review-events/types'
import { getMostCommonRewriteReason } from '@/lib/indicare-lab/patterns/pattern-detection-engine'
import type { LabPattern } from '@/lib/indicare-lab/patterns/types'
import type { LabOverviewMetric } from '@/lib/indicare-lab/types'

export function buildLabOverviewMetrics(input: {
  reviewSummary: ReviewEventSummary
  patterns: LabPattern[]
  pendingApprovals: number
}): LabOverviewMetric[] {
  const { reviewSummary, patterns, pendingApprovals } = input
  const shadowConfig = getShadowReviewConfigSnapshot()

  const highestRiskPattern = patterns[0]
  const mostCommonRewrite = getMostCommonRewriteReason()

  return [
    {
      id: 'total-review-events',
      label: 'Total review events',
      value: String(reviewSummary.total),
      hint: 'Internal evaluation · Development mode',
      tone: 'cyan'
    },
    {
      id: 'founder-attention',
      label: 'Events needing founder attention',
      value: String(reviewSummary.needsFounderAttention),
      hint: 'Rewrite, blocked, or needs founder review',
      tone: 'amber'
    },
    {
      id: 'recurring-patterns',
      label: 'Recurring patterns detected',
      value: String(patterns.length),
      hint: 'Pattern intelligence · Internal evaluation',
      tone: 'violet'
    },
    {
      id: 'highest-risk-pattern',
      label: 'Highest risk pattern',
      value: highestRiskPattern ? highestRiskPattern.title.slice(0, 40) + (highestRiskPattern.title.length > 40 ? '…' : '') : 'None detected',
      hint: highestRiskPattern
        ? `${highestRiskPattern.riskLevel} risk · ${highestRiskPattern.frequency} event${highestRiskPattern.frequency === 1 ? '' : 's'}`
        : 'No recurring patterns yet',
      tone: 'rose'
    },
    {
      id: 'common-rewrite-reason',
      label: 'Most common rewrite reason',
      value: mostCommonRewrite
        ? mostCommonRewrite.slice(0, 50) + (mostCommonRewrite.length > 50 ? '…' : '')
        : 'None yet',
      hint: 'Agent rewrite flags · Internal evaluation',
      tone: 'emerald'
    },
    {
      id: 'shadow-review-status',
      label: 'Shadow review status',
      value: shadowConfig.enabled ? 'Enabled' : 'Disabled',
      hint: shadowConfig.enabled
        ? `Shadow only · Redacted${shadowConfig.redactNames ? '' : ' (names off)'}`
        : 'Shadow review off · No live blocking',
      tone: shadowConfig.enabled ? 'cyan' : 'amber'
    },
    {
      id: 'pending-approvals',
      label: 'Pending founder approvals',
      value: String(pendingApprovals),
      hint: 'Governance queue · Founder decision required',
      tone: 'amber'
    },
    {
      id: 'brain-quality',
      label: 'Brain quality index',
      value: '72 / 100',
      hint: 'Synthetic development-mode score',
      tone: 'cyan'
    }
  ]
}
