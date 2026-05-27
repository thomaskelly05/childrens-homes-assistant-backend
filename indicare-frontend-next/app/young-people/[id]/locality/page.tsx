import { notFound } from 'next/navigation'

import { Card, DataTable, EmptyState, SectionHeader } from '@/components/indicare/ui'
import { RiskIntelligenceHeader, RiskIntelligenceShell } from '@/components/indicare/risk-intelligence-panels'
import { buildLocalityView } from '@/lib/indicare/risk-intelligence'

export default async function YoungPersonLocalityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = buildLocalityView(id)
  if (!view) notFound()

  return (
    <div className="space-y-6">
      <RiskIntelligenceHeader
        eyebrow="Locality intelligence"
        title={`${view.person.preferredName} locality`}
        description="Records indicate known locations, protective resources, evidence gaps and review prompts without automated conclusions."
        youngPersonId={id}
      />
      <RiskIntelligenceShell
        stats={[
          { label: 'Known locations', value: view.locations.length, detail: 'Derived from scoped incident and record evidence.' },
          { label: 'Protective resources', value: view.protectiveResources.length, detail: 'Visible support context and interests.' },
          { label: 'Evidence gaps', value: view.evidenceGaps.length, detail: 'Items for staff or manager review.' }
        ]}
        primary={view.protectiveResources}
        prompts={view.evidenceGaps}
        evidence={view.allEvidence}
      >
        <Card>
          <SectionHeader eyebrow="Known locations" title="Locality context" description="Pattern suggests these locations need source-record checking before operational use." />
          <DataTable
            headers={['Location', 'Category', 'Summary', 'Evidence']}
            rows={view.locations.map((location) => [location.name, location.category, location.summary, `${location.evidence.length} link(s)`])}
            empty={<EmptyState title="No known locations" description="No scoped locations are visible for this young person." />}
          />
        </Card>
      </RiskIntelligenceShell>
    </div>
  )
}
