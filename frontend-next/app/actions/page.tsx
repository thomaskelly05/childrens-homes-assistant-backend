import { ActionsPanel, EvidenceGapsPanel } from '@/components/indicare/action-evidence-panels'
import { Card, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getCareActions, getEvidenceGaps, getOpenCareActions } from '@/lib/evidence/selectors'

export default function ActionsPage() {
  const actions = getCareActions()
  const openActions = getOpenCareActions()
  const gaps = getEvidenceGaps()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Actions"
        title="Care actions and evidence gathering"
        description="Foundation action register for Reg 44 findings, safeguarding follow-up, LAC review evidence and manager oversight. Completion and attachment controls are placeholders."
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Actions" value={actions.length} />
        <StatCard label="Open" value={openActions.length} />
        <StatCard label="Overdue" value={actions.filter((action) => action.status === 'overdue').length} />
        <StatCard label="Evidence gaps" value={gaps.length} href="/evidence" />
      </section>
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
    </div>
  )
}
