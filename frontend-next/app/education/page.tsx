import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalBarChart } from '@/components/indicare/operational-cognition-widgets'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'
import { buildChronologyThemeData } from '@/lib/operational/cognition-metrics'

export default async function EducationPage() {
  const chronology = await getOsChronology({ search: 'education school attendance virtual homework learning achievement progress' })
  const events = chronology.data
  const attendanceEvents = events.filter((event) => /attendance|school|education/i.test(`${event.title} ${event.summary} ${event.fullText}`))
  const achievementEvents = events.filter((event) => /achievement|progress|homework|learning/i.test(`${event.title} ${event.summary} ${event.fullText}`))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Education"
        title="Education engagement and progress"
        description="A live education view drawn from chronology themes, evidence and child journey records, keeping school engagement connected to wellbeing and support."
        action={<Link href="/chronology?view=education" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Open chronology</Link>}
      />
      <LiveDataStatus result={chronology} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Education events" value={events.length} detail="Live chronology search results" />
        <StatCard label="Attendance themes" value={attendanceEvents.length} detail="School, attendance and engagement markers" />
        <StatCard label="Progress evidence" value={achievementEvents.length} detail="Achievement, progress and learning markers" />
        <StatCard label="Actions linked" value={events.reduce((total, event) => total + event.actionIds.length, 0)} detail="Follow-up connected to education events" />
      </section>
      <OperationalBarChart title="Education-related care themes" data={buildChronologyThemeData(events)} />
      <Card>
        <SectionHeader eyebrow="Education journey" title="Live chronology records" description="Education stays connected to relationships, emotional regulation and support effectiveness." />
        <DataTable
          headers={['Date', 'Event', 'Child', 'Summary']}
          rows={events.slice(0, 12).map((event) => [
            event.dateTime || event.createdAt || 'Date not returned',
            event.title,
            event.youngPersonIds.join(', ') || 'Not returned',
            event.summary || 'No summary returned'
          ])}
          empty={<EmptyState title="No education events returned" description="No live chronology rows matched education, school, learning or progress search terms." />}
        />
      </Card>
    </div>
  )
}
