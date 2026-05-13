import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { getYoungPersonById, sortByDateDesc } from '@/lib/indicare/selectors'

export default function SafeguardingPage() {
  const events = sortByDateDesc(indicareData.safeguardingEvents, (event) => event.date)
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Safeguarding" title="Safeguarding overview" description="Audit-ready safeguarding chronology with concern details, agency involvement, actions required and current status." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open concerns" value={events.filter((event) => event.status !== 'closed').length} />
        <StatCard label="Agency links" value={new Set(events.flatMap((event) => event.externalAgencies)).size} />
        <StatCard label="Chronology entries" value={events.length} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow="Chronology" title="Safeguarding timeline" />
          <RecordTimeline items={events.map((event) => ({ id: event.id, title: `${getYoungPersonById(event.youngPersonId)?.preferredName} · ${event.concernType}`, date: event.date, body: `${event.description} Action: ${event.actionTaken}`, href: `/young-people/${event.youngPersonId}` }))} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Actions" title="Open concern cards" />
          <div className="space-y-4">
            {events.map((event) => (
              <Link key={event.id} href={`/young-people/${event.youngPersonId}`} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                <StatusBadge value={event.status} />
                <h3 className="mt-3 text-lg font-black text-slate-950">{event.concernType}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{event.reportedTo} · {event.externalAgencies.join(', ')}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Register" title="Concern details" />
        <DataTable
          headers={['Date', 'Young person', 'Concern', 'Action taken', 'Reported to', 'Status']}
          rows={events.map((event) => [event.date, getYoungPersonById(event.youngPersonId)?.preferredName || event.youngPersonId, event.concernType, event.actionTaken, event.reportedTo, <StatusBadge key="status" value={event.status} />])}
          empty={<EmptyState title="No safeguarding events" description="No safeguarding events are recorded." />}
        />
      </Card>
    </div>
  )
}
