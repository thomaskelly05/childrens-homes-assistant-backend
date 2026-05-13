import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName, getAppointmentsForYoungPerson, getIncidentsForYoungPerson, getPlacementForYoungPerson, getStaffById } from '@/lib/indicare/selectors'

export default function YoungPeoplePage() {
  const rows = indicareData.youngPeople.map((person) => {
    const placement = getPlacementForYoungPerson(person.id)
    const keyWorker = getStaffById(person.allocatedKeyWorkerId)
    const latestIncident = getIncidentsForYoungPerson(person.id)[0]
    const nextAppointment = getAppointmentsForYoungPerson(person.id).find((appointment) => appointment.status !== 'closed')

    return [
      <Link key="name" href={`/young-people/${person.id}`} className="font-black text-slate-950 hover:text-blue-700">{fullName(person)}<span className="block text-xs font-bold text-slate-400">Preferred: {person.preferredName}</span></Link>,
      person.age,
      placement?.placementType || 'No placement',
      <RiskBadge key="risk" value={person.riskLevel} />,
      keyWorker ? fullName(keyWorker) : 'Unallocated',
      latestIncident ? <Link href={`/incidents/${latestIncident.id}`} className="font-bold text-blue-700">{latestIncident.type}</Link> : 'None recorded',
      nextAppointment ? `${nextAppointment.type} · ${new Date(nextAppointment.dateTime).toLocaleDateString('en-GB')}` : 'None scheduled',
      <StatusBadge key="status" value={person.status} />
    ]
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Young people"
        title="Young person records"
        description="Searchable, joined-up records connecting placement, risk, safeguarding, logs, incidents, medication, keywork, appointments, documents, reports and audit activity."
        action={<Link href="/daily-logs" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">+ Add recording</Link>}
      />

      <Card>
        <SectionHeader eyebrow="Directory" title="All young people" description="Filters: risk level, status and placement can be layered into this table without changing the data contract." />
        <DataTable
          headers={['Name', 'Age', 'Placement', 'Risk', 'Key worker', 'Latest incident', 'Next appointment', 'Status']}
          rows={rows}
          empty={<EmptyState title="No young people found" description="No young people found. Try changing filters or add a new record." />}
        />
      </Card>
    </div>
  )
}
