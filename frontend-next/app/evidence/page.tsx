import { ActionsPanel, EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { SccifCoveragePanel } from '@/components/indicare/workflows/sccif-coverage-panel'
import { getEvidenceGraph } from '@/lib/os-api/platform'
import { getOsActions } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'
import { getOsEvidence } from '@/lib/os-api/evidence'
import { getSccifCoverage } from '@/lib/regulatory-framework/mapping'

export default async function EvidencePage() {
  const [evidenceResult, actionsResult, chronologyResult, graphResult] = await Promise.all([getOsEvidence(), getOsActions(), getOsChronology(), getEvidenceGraph()])
  const evidence = evidenceResult.data
  const evidenceNeedingReview = evidence.filter((item) => ['draft', 'partial', 'review_required'].includes(item.quality))
  const actions = actionsResult.data.filter((action) => action.status !== 'completed')
  const sccifCoverage = getSccifCoverage(chronologyResult.data, evidence, actions)
  const relationships = graphResult.data.relationships.slice(0, 12)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence"
        title="Evidence and regulatory readiness"
        description="Live evidence register showing quality, linked regulations, gaps, and source traceability for actions and chronology events."
      />
      <LiveDataStatus result={evidenceResult} />
      <LiveDataStatus result={graphResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Evidence items" value={evidence.length} />
        <StatCard label="Strong/adequate" value={evidence.filter((item) => ['strong', 'adequate'].includes(item.quality)).length} />
        <StatCard label="Review required" value={evidence.filter((item) => item.quality === 'review_required').length} />
        <StatCard label="Possible gaps" value={evidenceNeedingReview.length} />
        <StatCard label="Evidence relationships" value={relationships.length} />
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader eyebrow="Evidence register" title="Linked evidence" />
          <EvidenceItemsPanel evidence={evidence} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Gaps" title="Possible evidence gaps" />
          {evidenceNeedingReview.length ? <EvidenceItemsPanel evidence={evidenceNeedingReview} /> : <EmptyState title="No evidence gaps returned" description="No draft, partial or review-required evidence items were returned by the backend." />}
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
      <Card>
        <SectionHeader eyebrow="Evidence graph" title="Operational evidence relationships" description="Shows how evidence connects to chronology, documents, regulations and operational states." />
        <DataTable
          headers={['Source', 'Relationship', 'Target', 'Inspection use']}
          rows={relationships.map((relationship) => [
            relationship.sourceLabel,
            relationship.relationshipType.replaceAll('_', ' '),
            relationship.targetLabel,
            <StatusBadge key={relationship.id} value={relationship.usedInInspectionReadiness ? 'used in readiness' : 'linked evidence'} />
          ])}
          empty={<EmptyState title="No evidence relationships returned" description="The evidence graph did not return relationships for this session." />}
        />
      </Card>
    </div>
  )
}
