import { OperationalOrbRail } from '@/components/orb-operational/operational-orb-rail'
import { childOrbHref } from '@/lib/navigation/scope-routes'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'

export function ChildWorkspaceOrbRail({ view }: { view: ChildWorkspaceOverviewViewModel }) {
  const name = view.child.preferredName || view.child.displayName
  const childId = view.child.id

  return (
    <OperationalOrbRail
      scopeType="child"
      childId={childId}
      childName={name}
      homeName={view.child.homeName}
      testId="child-workspace-orb-rail"
      actions={[
        { label: 'Safeguarding themes', href: childOrbHref(childId, 'safeguarding_themes'), testId: 'child-orb-safeguarding' },
        { label: 'Child journey summary', href: childOrbHref(childId, 'child_journey_summary') },
        { label: 'Ofsted evidence review', href: childOrbHref(childId, 'ofsted_evidence_review') },
        { label: 'Archive themes', href: childOrbHref(childId, 'archive_summary'), testId: 'child-orb-archive-summary' },
        { label: 'Chronology story', href: childOrbHref(childId, 'chronology_story_review'), testId: 'child-orb-chronology-story' },
        { label: 'Plan impacts', href: childOrbHref(childId, 'plan_impact_review'), testId: 'child-orb-plan-impact-review' },
        { label: 'LifeEcho support', href: childOrbHref(childId, 'lifeecho_memory_support'), testId: 'child-orb-lifeecho-support' }
      ]}
    />
  )
}
