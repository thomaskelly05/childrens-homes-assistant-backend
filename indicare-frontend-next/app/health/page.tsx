import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalBarChart } from '@/components/indicare/operational-cognition-widgets'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'
import { buildChronologyThemeData } from '@/lib/operational/cognition-metrics'

export default async function HealthPage() {
  const chronology = await getOsChronology({ search: 'health medication appointment camhs wellbeing regulation sensory sleep' })
  const events = chronology.data
  const healthEvents = events.filter((event) => /health|camhs|appointment|medication/i.test(`${event.title} ${event.summary} ${event.fullText}`))
  const regulationEvents = events.filter((event) => /regulation|sensory|sleep|wellbeing|mood/i.test(`${event.title} ${event.summary} ${event.fullText}`))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Health"
        title="Health, identity and regulation"
        description="A joined view of health, medication, appointments and emotional regulation, grounded in live chronology and record links."
        action={<Link href="/medication" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Medication</Link>}
      />
      <LiveDataStatus result={chronology} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Health signals" value={healthEvents.length} detail="Health, CAMHS, appointment and medication markers" />
        <StatCard label="Regulation signals" value={regulationEvents.length} detail="Wellbeing, sensory, sleep and mood markers" />
        <StatCard label="Evidence linked" value={events.reduce((total, event) => total + event.evidenceIds.length, 0)} detail="Evidence IDs connected to health records" />
        <StatCard label="Actions linked" value={events.reduce((total, event) => total + event.actionIds.length, 0)} detail="Follow-up connected to health events" />
      </section>
      <OperationalBarChart title="Health and regulation themes" data={buildChronologyThemeData(events)} />
      <Card>
        <SectionHeader eyebrow="Health chronology" title="Live health-related records" description="Health stays linked to emotional safety, appointments and child journey context." />
        <DataTable
          headers={['Date', 'Event', 'Severity', 'Summary']}
          rows={events.slice(0, 12).map((event) => [
            event.dateTime || event.createdAt || 'Date not returned',
            event.title,
            <StatusBadge key={event.id} value={event.severity} />,
            event.summary || 'No summary returned'
          ])}
          empty={<EmptyState title="No health records returned" description="No live chronology rows matched health, medication, appointment or regulation search terms." />}
        />
      </Card>
    </div>
  )
}
