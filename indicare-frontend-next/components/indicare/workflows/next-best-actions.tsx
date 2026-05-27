import { CareAction, EvidenceGap } from '@/lib/evidence/types'
import { RegulatoryCoverageItem } from '@/lib/regulatory-framework/types'

import { WorkflowActionCard } from './workflow-action-card'

export function NextBestActions({
  actions,
  gaps,
  coverageItems = []
}: {
  actions: CareAction[]
  gaps: EvidenceGap[]
  coverageItems?: RegulatoryCoverageItem[]
}) {
  const overdue = actions.filter((action) => action.status === 'overdue')
  const reviewItems = coverageItems.filter((item) => item.evidenceStrength === 'review_required' || item.evidenceStrength === 'gap').slice(0, 2)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {overdue.slice(0, 2).map((action) => (
        <WorkflowActionCard key={action.id} href={`/actions/${action.id}`} title={action.title} description={action.description} meta="Action overdue" tone="red" />
      ))}
      {gaps.slice(0, 2).map((gap) => (
        <WorkflowActionCard key={gap.id} href={gap.sourceEventIds[0] ? `/chronology/${gap.sourceEventIds[0]}` : '/evidence'} title={gap.title} description={gap.suggestedAction} meta="Evidence gap" tone="amber" />
      ))}
      {reviewItems.map((item) => (
        <WorkflowActionCard key={item.reference.id} href={`/regulatory/${item.reference.id}`} title={item.reference.title} description={item.suggestedNextAction} meta="Readiness review" tone="blue" />
      ))}
    </div>
  )
}
