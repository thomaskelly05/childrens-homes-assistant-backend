import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function CalendarPage() {
  const chronology = await getOsChronology({ search: 'appointment handover meeting review visit school health medication keywork' })
  const events = chronology.data
  const appointmentEvents = events.filter((event) => ['appointment', 'health', 'medication'].includes(event.sourceType) || /appointment|health|medication/i.test(`${event.title} ${event.summary}`))
  const reviewEvents = events.filter((event) => /review|meeting|reg 44|reg44|lac/i.test(`${event.title} ${event.summary} ${event.category}`))
  const shiftEvents = events.filter((event) => /handover|shift|keywork/i.test(`${event.title} ${event.summary} ${event.category}`))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Operational continuity by date"
        description="Appointments, reviews, handovers and key moments gathered from live chronology so shift teams can orientate quickly."
        action={<Link href="/appointments" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Appointments</Link>}
      />
      <LiveDataStatus result={chronology} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Calendar signals" value={events.length} detail="Live chronology rows" />
        <StatCard label="Appointments" value={appointmentEvents.length} detail="Health, medication and appointment markers" href="/appointments" />
        <StatCard label="Reviews" value={reviewEvents.length} detail="Review and visit markers" href="/reports" />
        <StatCard label="Shift continuity" value={shiftEvents.length} detail="Handover and keywork markers" href="/shifts/current" />
      </section>
      <Card>
        <SectionHeader eyebrow="Upcoming and recent" title="Calendar-linked operational records" description="Calendar uses existing chronology and appointment routes rather than a separate scheduling system." />
        <DataTable
          headers={['When', 'Type', 'Event', 'Posture']}
          rows={events.slice(0, 16).map((event) => [
            event.dateTime || event.createdAt || 'Date not returned',
            event.eventType.replaceAll('_', ' '),
            event.title,
            <StatusBadge key={event.id} value={event.severity} />
          ])}
          empty={<EmptyState title="No calendar-linked records returned" description="No chronology rows matched appointment, handover, review, visit or keywork terms." />}
        />
      </Card>
    </div>
  )
}
