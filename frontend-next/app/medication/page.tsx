import Link from 'next/link'

import { AlertCard, Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { getYoungPersonById } from '@/lib/indicare/selectors'

export default function MedicationPage() {
  const alerts = indicareData.medicationRecords.filter((medication) => medication.administrationHistory.some((entry) => ['missed', 'overdue'].includes(entry.status)))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Medication" title="Medication overview" description="Active medication, administration history foundations, allergies and missed or overdue medication alerts." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active medication" value={indicareData.medicationRecords.filter((record) => record.status === 'active').length} />
        <StatCard label="Medication alerts" value={alerts.length} />
        <StatCard label="Allergies recorded" value={indicareData.youngPeople.flatMap((person) => person.allergies).filter((item) => item !== 'None recorded').length} />
      </section>
      {alerts.length ? (
        <Card>
          <SectionHeader eyebrow="Alerts" title="Medication alerts" />
          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((medication) => <AlertCard key={medication.id} title={`${getYoungPersonById(medication.youngPersonId)?.preferredName} · ${medication.medicationName}`} body={medication.administrationHistory.filter((entry) => ['missed', 'overdue'].includes(entry.status)).map((entry) => `${entry.status}: ${entry.notes}`).join(' ')} href={`/young-people/${medication.youngPersonId}`} />)}
          </div>
        </Card>
      ) : null}
      <Card>
        <SectionHeader eyebrow="MAR foundation" title="Medication records" />
        <DataTable
          headers={['Young person', 'Medication', 'Dosage', 'Frequency', 'Route', 'Prescribed by', 'Last/admin status', 'Status']}
          rows={indicareData.medicationRecords.map((record) => {
            const person = getYoungPersonById(record.youngPersonId)
            const last = record.administrationHistory[record.administrationHistory.length - 1]
            return [
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : record.youngPersonId,
              record.medicationName,
              record.dosage,
              record.frequency,
              record.route,
              record.prescribedBy,
              last ? `${last.status} · ${last.notes}` : 'No history',
              <StatusBadge key="status" value={record.status} />
            ]
          })}
          empty={<EmptyState title="No medication records" description="No medication records are recorded." />}
        />
      </Card>
    </div>
  )
}
