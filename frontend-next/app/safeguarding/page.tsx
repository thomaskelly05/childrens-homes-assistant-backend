import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, DataTable, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getSafeguardingDashboard } from '@/lib/os-api/platform'

function formatDate(value?: string) {
  if (!value) return 'Date not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function SafeguardingPage({
  searchParams
}: {
  searchParams: Promise<{ young_person_id?: string }>
}) {
  const query = await searchParams
  const dashboard = await getSafeguardingDashboard(query.young_person_id)
  const data = dashboard.data
  const openRecords = data.records.filter((record) => record.status !== 'closed').slice(0, 8)
  const timelineEvents = data.chronology.slice(0, 15)
  const openActions = data.actions.filter((action) => action.status !== 'completed').slice(0, 10)
  const lifecycle = data.lifecycle.slice(0, 20)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Safeguarding"
        title="Safeguarding oversight"
        description="A calm review dashboard showing active concerns, safeguarding-linked chronology, possible evidence gaps and follow-up actions returned by the backend."
      />
      <LiveDataStatus result={dashboard} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open concerns" value={openRecords.length} detail="First 8 open records shown" />
        <StatCard label="Safeguarding chronology" value={data.chronology.length} detail="First 15 events shown" />
        <StatCard label="Open actions" value={openActions.length} detail="First 10 actions shown" />
        <StatCard label="Possible child voice gaps" value={data.missingChildVoice.length} detail="Needs professional review" />
        <StatCard label="Possible oversight gaps" value={data.missingOversight.length} detail="Manager review marker not visible" />
        <StatCard label="Evidence links" value={data.chronology.filter((event) => event.evidenceIds.length).length} detail="Chronology events with evidence IDs" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow="Chronology" title="Safeguarding-linked timeline" description="Source chronology with cautious markers only where metadata or wording is present." />
          <RecordTimeline items={timelineEvents.map((event) => ({
            id: event.id,
            title: event.title,
            date: formatDate(event.dateTime),
            body: event.summary || 'No summary was returned for this safeguarding-linked event.',
            href: `/chronology/${encodeURIComponent(event.id)}`
          }))} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Review" title="Open concern cards" />
          <div className="space-y-4">
            {openRecords.map((record) => (
              <Link prefetch={false} key={record.id} href={record.href || '/safeguarding'} className="block rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
                <StatusBadge value={record.status || 'needs review'} />
                <h3 className="mt-3 text-lg font-black text-slate-950">{record.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{record.summary}</p>
              </Link>
            ))}
            {!openRecords.length ? <EmptyState title="No open safeguarding records" description="No open safeguarding concerns or alerts were returned by the backend." /> : null}
          </div>
        </Card>
      </section>
      <Card>
        <OperationalLifecyclePanel
          title="Safeguarding lifecycle oversight"
          description="Acknowledgement, review, escalation and resolution markers are visible where returned by the backend or inferred from status."
          items={lifecycle}
          hrefForItem={(item) => item.entityType.includes('chronology') ? `/chronology/${encodeURIComponent(item.id)}` : undefined}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="Register" title="Concern details and next action" />
        <DataTable
          headers={['Date', 'Young person', 'Concern', 'Status', 'Evidence/actions']}
          rows={data.records.slice(0, 20).map((record) => [
            formatDate(record.date),
            record.childName || record.youngPersonId || 'Not linked',
            <Link prefetch={false} key={record.id} href={record.href || '/safeguarding'} className="font-black text-slate-950 hover:text-blue-700">{record.title}</Link>,
            <StatusBadge key="status" value={record.status || 'needs review'} />,
            `${record.evidenceIds.length} evidence · ${record.actionIds.length} actions`
          ])}
          empty={<EmptyState title="No safeguarding records" description="No safeguarding records are visible for this session." />}
        />
      </Card>
    </div>
  )
}