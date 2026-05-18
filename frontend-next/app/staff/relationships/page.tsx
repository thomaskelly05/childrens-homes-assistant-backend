import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceRelationships } from '@/lib/os-api/workforce'

export default async function WorkforceRelationshipsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceRelationships(query.staff_id)
  const relationships = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Intelligence"
        title="Relationship intelligence"
        description="Tracks relational consistency, positive engagement, conflict trends, keyworker stability and relational safety indicators."
        action={<Link href="/staff/command-centre" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Command centre</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Relationships" value={relationships.home_view?.tracked_relationships ?? relationships.indicators.length} detail="Tracked staff-child pairs" />
        <StatCard label="Positive engagement" value={relationships.home_view?.positive_engagements ?? 0} detail="Strength-based indicators" />
        <StatCard label="Conflict trends" value={relationships.home_view?.conflict_indicators ?? 0} detail="Records needing reflection" />
        <StatCard label="Child views" value={Object.keys(relationships.child_views || {}).length} detail="Relational views by child" />
      </section>
      <Card>
        <SectionHeader eyebrow="Relational practice" title="Staff-child consistency" description={String(relationships.home_view?.stability_notes || 'Relational indicators are derived centrally from workforce intelligence records.')} />
        <DataTable
          headers={['Staff', 'Child', 'Interactions', 'Positive', 'Conflict', 'Safety']}
          rows={relationships.indicators.map((item) => [
            String(item.staff_id || 'unknown'),
            String(item.young_person_id || 'unknown'),
            String(item.interactions ?? 0),
            String(item.positive_engagement ?? 0),
            String(item.conflict_indicators ?? 0),
            <StatusBadge key="safety" value={`${item.relational_safety_score ?? 'n/a'}`} />
          ])}
          empty={<EmptyState title="No relationship indicators" description="Relationship views need recordings that include both staff and child identifiers." />}
        />
      </Card>
    </div>
  )
}
