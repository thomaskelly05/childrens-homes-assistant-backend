import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getWorkforceChronology, getWorkforceStaffProfile } from '@/lib/os-api/workforce'

export default async function StaffChronologyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [profileResult, chronologyResult] = await Promise.all([
    getWorkforceStaffProfile(id),
    getWorkforceChronology(id)
  ])
  const profile = profileResult.data
  const staffTitle = profile?.staff?.title || `Staff #${id}`
  const chronology = chronologyResult.data
  const items = chronology.events.map((event) => ({
    id: String(event.id),
    title: String(event.title || event.event_type || 'Workforce event'),
    date: String(event.event_at || 'Date not returned'),
    body: String(event.summary || event.severity || 'No summary returned.'),
    href: event.route ? String(event.route) : undefined
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Chronology"
        title={`${staffTitle} timeline`}
        description="Evidence-aware staff chronology for supervision, training, probation, practice concerns, wellbeing, recognition, incidents, role changes and lifecycle events."
        action={<Link href={`/staff/${encodeURIComponent(id)}`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Profile hub</Link>}
      />
      <LiveDataStatus result={chronologyResult} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Events" value={chronology.summary.total} detail="Aggregated chronology records" />
        <StatCard label="Event types" value={Object.keys(chronology.summary.by_type || {}).length} detail="Sources contributing to timeline" />
        <StatCard label="Latest event" value={chronology.summary.latest_event_at ? 'returned' : 'none'} detail={chronology.summary.latest_event_at || 'No event date'} />
      </section>
      <Card>
        <SectionHeader eyebrow="Timeline" title="Chronology aggregation" description="Linked evidence references are preserved on each event when the backend has them." />
        <RecordTimeline items={items} />
      </Card>
      <Card>
        <SectionHeader eyebrow="Evidence references" title="Linked evidence by event" />
        <DataTable
          headers={['Event', 'Source', 'Linked evidence']}
          rows={chronology.events.map((event) => [
            String(event.title || event.event_type || 'Event'),
            `${event.source_table || 'source'}:${event.source_id || ''}`,
            Array.isArray(event.linked_evidence) && event.linked_evidence.length ? `${event.linked_evidence.length} linked` : 'none returned'
          ])}
          empty={<EmptyState title="No chronology events" description="No linked evidence references were returned for this staff member." />}
        />
      </Card>
    </div>
  )
}
