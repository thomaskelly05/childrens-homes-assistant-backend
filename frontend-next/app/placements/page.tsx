import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName, getYoungPersonById } from '@/lib/indicare/selectors'

export default function PlacementsPage() {
  const active = indicareData.placements.filter((placement) => placement.status !== 'closed')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Placements" title="Placement overview" description="Occupancy, placement goals, local authority details, social worker contacts and timelines linked directly to young person records." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active placements" value={active.length} href="/placements" />
        <StatCard label="Available capacity" value={Math.max(0, 7 - active.length)} detail="Demo home capacity: 7" />
        <StatCard label="Planned endings" value={indicareData.placements.filter((placement) => placement.plannedEndDate).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Active" title="Current placements" />
        <DataTable
          headers={['Young person', 'Type', 'Start', 'Planned end', 'Local authority', 'Social worker', 'Goals', 'Status']}
          rows={indicareData.placements.map((placement) => {
            const person = getYoungPersonById(placement.youngPersonId)
            return [
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{fullName(person)}</Link> : placement.youngPersonId,
              placement.placementType,
              placement.startDate,
              placement.plannedEndDate || 'Not set',
              placement.localAuthority,
              `${placement.socialWorkerName} · ${placement.socialWorkerContact}`,
              placement.placementGoals.join(', '),
              <StatusBadge key="status" value={placement.status} />
            ]
          })}
          empty={<EmptyState title="No placements" description="No placements are recorded yet." />}
        />
      </Card>
    </div>
  )
}
