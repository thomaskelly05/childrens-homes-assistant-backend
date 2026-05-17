import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function AppointmentsPage() {
  const appointmentsResult = await getOsChronology({ sourceType: 'appointment' })
  const appointments = appointmentsResult.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Appointments" title="Appointments" description="Upcoming, missed, completed and follow-up appointments linked to young person and staff records." />
      <LiveDataStatus result={appointmentsResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Appointments" value={appointments.length} />
        <StatCard label="Actions linked" value={appointments.filter((appointment) => appointment.actionIds.length).length} />
        <StatCard label="Evidence linked" value={appointments.filter((appointment) => appointment.evidenceIds.length).length} />
        <StatCard label="Manager review" value={appointments.filter((appointment) => appointment.tags.includes('manager-review')).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Diary" title="Appointment list" />
        <DataTable
          headers={['Date/time', 'Young person', 'Staff', 'Type', 'Summary', 'Evidence', 'Actions', 'Status']}
          rows={appointments.map((appointment) => [
              new Date(appointment.dateTime).toLocaleString('en-GB'),
              appointment.youngPersonIds[0] ? <Link key={appointment.id} href={`/young-people/${appointment.youngPersonIds[0]}`} className="font-bold text-blue-700">Child {appointment.youngPersonIds[0]}</Link> : 'Home-wide',
              appointment.staffIds[0] || 'Not recorded',
              <Link key={appointment.id} href={`/appointments/${appointment.sourceId || appointment.id}`} className="font-black text-slate-950 hover:text-blue-700">{appointment.title}</Link>,
              appointment.summary,
              appointment.evidenceIds.length,
              appointment.actionIds.length,
              <StatusBadge key="status" value={appointment.tags.includes('manager-review') ? 'review' : 'recorded'} />
          ])}
          empty={<EmptyState title="No appointments" description="No appointments match your current filters." />}
        />
      </Card>
    </div>
  )
}
