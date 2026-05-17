import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function MedicationPage() {
  const medicationResult = await getOsChronology({ sourceType: 'medication' })
  const medication = medicationResult.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Medication" title="Medication overview" description="Active medication, administration history foundations, allergies and missed or overdue medication alerts." />
      <LiveDataStatus result={medicationResult} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Medication records" value={medication.length} />
        <StatCard label="High priority" value={medication.filter((record) => ['high', 'critical'].includes(record.severity)).length} />
        <StatCard label="Actions linked" value={medication.filter((record) => record.actionIds.length).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="MAR foundation" title="Medication records" />
        <DataTable
          headers={['Young person', 'Medication record', 'Summary', 'Evidence', 'Actions', 'Status']}
          rows={medication.map((record) => [
            record.youngPersonIds[0] ? <Link key={record.id} href={`/young-people/${record.youngPersonIds[0]}`} className="font-bold text-blue-700">Child {record.youngPersonIds[0]}</Link> : 'Home-wide',
            <Link key={record.id} href={`/medication/${record.sourceId || record.id}`} className="font-black text-slate-950 hover:text-blue-700">{record.title}</Link>,
            record.summary,
            record.evidenceIds.length,
            record.actionIds.length,
            <StatusBadge key="status" value={record.tags.includes('manager-review') ? 'review' : 'recorded'} />
          ])}
          empty={<EmptyState title="No medication records" description="No medication records are recorded." />}
        />
      </Card>
    </div>
  )
}
