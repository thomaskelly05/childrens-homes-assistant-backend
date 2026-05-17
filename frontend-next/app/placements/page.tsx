import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'

export default async function PlacementsPage() {
  const youngPeopleResult = await getOsYoungPeople()
  const youngPeople = youngPeopleResult.data
  const active = youngPeople.filter((person) => person.placementStatus !== 'closed')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Placements" title="Placement overview" description="Occupancy, placement goals, local authority details, social worker contacts and timelines linked directly to young person records." />
      <LiveDataStatus result={youngPeopleResult} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active placements" value={active.length} href="/placements" />
        <StatCard label="Placement records" value={youngPeople.length} detail="Live young-person register" />
        <StatCard label="Planned endings" value={youngPeople.filter((person) => person.plannedEndDate).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Active" title="Current placements" />
        <DataTable
          headers={['Young person', 'Placement', 'Legal status', 'Care planning', 'Key worker', 'Status']}
          rows={youngPeople.map((person) => [
            <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.displayName}</Link>,
            String(person.placementStatus || 'Not recorded'),
            String(person.legalStatus || 'Not recorded'),
            String(person.carePlanning || 'Not recorded'),
            String(person.keyWorkerId || 'Not recorded'),
            <StatusBadge key="status" value={String(person.status || person.placementStatus || 'recorded')} />
          ])}
          empty={<EmptyState title="No placements" description="No placements are recorded yet." />}
        />
      </Card>
    </div>
  )
}
