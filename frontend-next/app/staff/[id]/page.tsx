import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { fullName, getAppointmentsByStaff, getAssignedYoungPeople, getIncidentsByStaff, getKeyworkByStaff, getLogsByStaff, getStaffById } from '@/lib/indicare/selectors'

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = getStaffById(id)
  if (!member) notFound()

  const assigned = getAssignedYoungPeople(id)
  const logs = getLogsByStaff(id)
  const incidents = getIncidentsByStaff(id)
  const keywork = getKeyworkByStaff(id)
  const appointments = getAppointmentsByStaff(id)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff profile" title={fullName(member)} description={`${member.role}. ${member.shiftPattern}. ${member.email} · ${member.phone}`} />
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Profile" title="Role and qualifications" />
          <StatusBadge value={member.status} />
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {member.qualifications.map((qualification) => <li key={qualification}>{qualification}</li>)}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Assigned" title="Young people" />
          <DataTable
            headers={['Name', 'Risk', 'Status']}
            rows={assigned.map((person) => [
              <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName} {person.lastName}</Link>,
              person.riskLevel,
              person.status
            ])}
            empty={<EmptyState title="No assigned young people" description="This staff member has no allocated young people in the demo data." />}
          />
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Recording" title="Recent logs written" />
          <DataTable headers={['Date', 'Shift', 'Young person', 'Actions']} rows={logs.map((log) => [log.date, log.shift, log.youngPersonId, log.followUpActions.join(', ')])} empty={<EmptyState title="No logs" description="No logs written by this staff member." />} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Incidents" title="Incidents involved in" />
          <DataTable headers={['Date', 'Type', 'Severity', 'Status']} rows={incidents.map((incident) => [new Date(incident.dateTime).toLocaleDateString('en-GB'), <Link key={incident.id} href={`/incidents/${incident.id}`} className="font-bold text-blue-700">{incident.type}</Link>, incident.severity, incident.status])} empty={<EmptyState title="No incidents" description="No incidents recorded for this staff member." />} />
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Keywork" title="Completed keywork" />
          <DataTable headers={['Date', 'Young person', 'Topic', 'Next']} rows={keywork.map((session) => [session.date, session.youngPersonId, session.topic, session.nextSessionDate])} empty={<EmptyState title="No keywork" description="No keywork sessions recorded." />} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Tasks" title="Appointments attended" />
          <DataTable headers={['Date', 'Type', 'Professional', 'Follow-up']} rows={appointments.map((appointment) => [new Date(appointment.dateTime).toLocaleDateString('en-GB'), appointment.type, appointment.professional, appointment.followUpRequired ? 'Required' : 'No'])} empty={<EmptyState title="No appointments" description="No appointments linked to this staff member." />} />
        </Card>
      </section>
    </div>
  )
}
