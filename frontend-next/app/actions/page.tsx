import { ActionsPanel, EvidenceGapsPanel } from '@/components/indicare/action-evidence-panels'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { ManagementOversightPanel } from '@/components/indicare/workflows/management-oversight-panel'
import { NextBestActions } from '@/components/indicare/workflows/next-best-actions'
import { getOsActions } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function ActionsPage() {
  const [actionsResult, chronologyResult] = await Promise.all([getOsActions(), getOsChronology()])
  const actions = actionsResult.data
  const openActions = actions.filter((action) => action.status !== 'completed')
  const gaps = actions
    .filter((action) => action.evidenceRequired.length && !action.evidenceIds.length)
    .map((action) => ({
      id: `action-evidence:${action.id}`,
      title: action.title,
      description: `Evidence required: ${action.evidenceRequired.join(', ')}`,
      regulation: action.regulation,
      priority: action.priority,
      youngPersonId: action.youngPersonId,
      sourceEventIds: action.sourceId ? [action.sourceId] : []
    }))
  const events = chronologyResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Actions"
        title="Care actions and evidence gathering"
        description="Live action register for Reg 44 findings, safeguarding follow-up, LAC review evidence and management oversight."
      />
      <LiveDataStatus result={actionsResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Actions" value={actions.length} />
        <StatCard label="Open" value={openActions.length} />
        <StatCard label="Overdue" value={actions.filter((action) => action.status === 'overdue').length} />
        <StatCard label="Evidence required" value={gaps.length} href="/evidence" />
      </section>
      <Card>
        <SectionHeader eyebrow="Workflow" title="Next best actions" description="Cards link to the action, evidence or chronology workflow that should be opened next." />
        <NextBestActions actions={actions} gaps={gaps} />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Action register" title="Open and recent actions" />
          <ActionsPanel actions={actions} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Evidence required" title="Gaps linked to actions" />
          <EvidenceGapsPanel gaps={gaps} />
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Management oversight" title="Manager review and sign-off readiness" />
        <ManagementOversightPanel events={events} actions={actions} />
      </Card>
    </div>
  )
}
