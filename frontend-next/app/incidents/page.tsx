import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, RiskBadge, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function IncidentsPage() {
  const incidentsResult = await getOsChronology({ sourceType: 'incident' })
  const incidents = incidentsResult.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Incidents" title="Incident management" description="Incident records with severity, safeguarding flags, staff involvement, follow-up actions and manager review status." action={<Link href="/home" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Choose child to create incident</Link>} />
      <LiveDataStatus result={incidentsResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total incidents" value={incidents.length} />
        <StatCard label="Manager review" value={incidents.filter((incident) => incident.tags.includes('manager-review')).length} />
        <StatCard label="Safeguarding flags" value={incidents.filter((incident) => incident.safeguardingFlags.length).length} />
        <StatCard label="High/critical" value={incidents.filter((incident) => ['high', 'critical'].includes(incident.severity)).length} />
      </section>
      <Card>
        <SectionHeader eyebrow="Register" title="Incident list" description="Filters supported by fields: severity, young person, date and status." />
        <DataTable
          headers={['Date/time', 'Young person', 'Type', 'Severity', 'Safeguarding', 'Manager review', 'Status']}
          rows={incidents.map((incident) => [
              new Date(incident.dateTime).toLocaleString('en-GB'),
              incident.youngPersonIds[0] ? <Link key={incident.id} href={`/young-people/${incident.youngPersonIds[0]}`} className="font-bold text-blue-700">Child {incident.youngPersonIds[0]}</Link> : 'Home-wide',
              <Link key={incident.id} href={`/incidents/${incident.sourceId || incident.id}`} className="font-black text-slate-950 hover:text-blue-700">{incident.title}</Link>,
              <RiskBadge key="severity" value={incident.severity} />,
              incident.safeguardingFlags.length ? 'Linked' : 'No',
              incident.tags.includes('manager-review') ? 'Review' : 'Not flagged',
              <StatusBadge key="status" value={incident.tags.includes('manager-review') ? 'review' : 'recorded'} />
          ])}
          empty={<EmptyState title="No incidents" description="No incidents match your current filters." />}
        />
      </Card>
    </div>
  )
}
