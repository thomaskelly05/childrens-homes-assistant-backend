import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { fullName, getStaffById, getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'

export default function AppointmentsPage() {
  const upcoming = indicareData.appointments.filter((appointment) => appointment.status !== 'closed')
  const completed = indicareData.appointments.filter((appointment) => appointment.status === 'closed')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Appointments" title="Appointments" description="Upcoming, missed, completed and follow-up appointments linked to young person and staff records." />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Missed" value={indicareData.appointments.filter((appointment) => appointment.status === 'overdue').length} />
        <StatCard label="Follow-up required" value={indicareData.appointments.filter((appointment) => appointment.followUpRequired).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Diary" title="Appointment list" />
        <DataTable
          headers={['Date/time', 'Young person', 'Staff', 'Type', 'Professional/location', 'Outcome', 'Follow-up', 'Status']}
          rows={sortByDateDesc(indicareData.appointments, (appointment) => appointment.dateTime).map((appointment) => {
            const person = getYoungPersonById(appointment.youngPersonId)
            const staff = getStaffById(appointment.staffId)
            return [
              new Date(appointment.dateTime).toLocaleString('en-GB'),
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : appointment.youngPersonId,
              staff ? fullName(staff) : appointment.staffId,
              appointment.type,
              `${appointment.professional} · ${appointment.location}`,
              appointment.outcome,
              appointment.followUpRequired ? 'Required' : 'No',
              <StatusBadge key="status" value={appointment.status} />
            ]
          })}
          empty={<EmptyState title="No appointments" description="No appointments match your current filters." />}
        />
      </Card>
    </div>
  )
}
