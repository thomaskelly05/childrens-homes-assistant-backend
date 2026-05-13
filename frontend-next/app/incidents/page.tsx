import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, RiskBadge, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Incidents" title="Incident management" description="Incident records with severity, safeguarding flags, staff involvement, follow-up actions and manager review status." action={<button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Create incident</button>} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total incidents" value={indicareData.incidents.length} />
        <StatCard label="Open/review" value={indicareData.incidents.filter((incident) => incident.status !== 'closed').length} />
        <StatCard label="Safeguarding flags" value={indicareData.incidents.filter((incident) => incident.safeguardingRequired).length} />
        <StatCard label="High/critical" value={indicareData.incidents.filter((incident) => ['high', 'critical'].includes(incident.severity)).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Register" title="Incident list" description="Filters supported by fields: severity, young person, date and status." />
        <DataTable
          headers={['Date/time', 'Young person', 'Type', 'Severity', 'Safeguarding', 'Manager review', 'Status']}
          rows={sortByDateDesc(indicareData.incidents, (incident) => incident.dateTime).map((incident) => {
            const person = getYoungPersonById(incident.youngPersonId)
            return [
              new Date(incident.dateTime).toLocaleString('en-GB'),
              person ? <Link key={person.id} href={`/young-people/${person.id}`} className="font-bold text-blue-700">{person.preferredName}</Link> : incident.youngPersonId,
              <Link key={incident.id} href={`/incidents/${incident.id}`} className="font-black text-slate-950 hover:text-blue-700">{incident.type}</Link>,
              <RiskBadge key="severity" value={incident.severity} />,
              incident.safeguardingRequired ? 'Required' : 'No',
              incident.managerReview,
              <StatusBadge key="status" value={incident.status} />
            ]
          })}
          empty={<EmptyState title="No incidents" description="No incidents match your current filters." />}
        />
      </Card>
    </div>
  )
}
