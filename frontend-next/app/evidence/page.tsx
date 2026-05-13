import { ActionsPanel, EvidenceGapsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { Card, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { SccifCoveragePanel } from '@/components/indicare/workflows/sccif-coverage-panel'
import { getChronologyEvents } from '@/lib/chronology/selectors'
import { getEvidenceGaps, getEvidenceItems, getOpenCareActions } from '@/lib/evidence/selectors'
import { getSccifCoverage } from '@/lib/regulatory-framework/mapping'

export default function EvidencePage() {
  const evidence = getEvidenceItems()
  const gaps = getEvidenceGaps()
  const actions = getOpenCareActions()
  const sccifCoverage = getSccifCoverage(getChronologyEvents(), evidence, actions)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence"
        title="Evidence and regulatory readiness"
        description="Evidence register showing quality, linked regulations, gaps, and placeholder controls for attaching evidence to actions and chronology events."
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Evidence items" value={evidence.length} />
        <StatCard label="Strong/adequate" value={evidence.filter((item) => ['strong', 'adequate'].includes(item.quality)).length} />
        <StatCard label="Review required" value={evidence.filter((item) => item.quality === 'review_required').length} />
        <StatCard label="Gaps" value={gaps.length} />
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Evidence register" title="Linked evidence" />
          <EvidenceItemsPanel evidence={evidence} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Gaps" title="Evidence gaps" />
          <EvidenceGapsPanel gaps={gaps} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Actions" title="Evidence gathering actions" />
          <ActionsPanel actions={actions} />
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="SCCIF alignment" title="Evidence mapped to inspection areas" />
        <SccifCoveragePanel items={sccifCoverage.items} limit={6} />
      </Card>
    </div>
  )
}
