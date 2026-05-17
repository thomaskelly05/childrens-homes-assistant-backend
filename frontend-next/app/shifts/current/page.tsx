import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getCommandCentre } from '@/lib/os-api/platform'

const liveRecordingRoutes = [
  { id: 'daily_note', label: 'Daily note', route: '/home' },
  { id: 'incident', label: 'Incident', route: '/home' },
  { id: 'safeguarding', label: 'Safeguarding', route: '/safeguarding' }
]

export default async function CurrentShiftPage() {
  const commandResult = await getCommandCentre()
  const command = commandResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Current shift"
        title="Current shift"
        description="Live shift board for welfare checks, room checks, incidents, safeguarding concerns, medication alerts, appointments, recording, handover and manager escalations."
        action={<Link href="/handover/current" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Prepare handover</Link>}
      />
      <LiveDataStatus result={commandResult} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Incidents" value={command.chronology.filter((event) => event.sourceType === 'incident').length} detail="Returned by live chronology" href="/incidents" entity={{ entity_type: 'incident' }} />
        <StatCard label="Safeguarding" value={command.safeguarding.length} detail="Review required, no auto conclusions" href="/safeguarding" entity={{ entity_type: 'safeguarding_concern' }} />
        <StatCard label="Medication records" value={command.chronology.filter((event) => event.sourceType === 'medication').length} detail="Returned by live chronology" href="/medication" entity={{ entity_type: 'medication_record' }} />
        <StatCard label="Open actions" value={command.actions.filter((action) => action.status !== 'completed').length} detail="Actions needing attention" href="/actions" entity={{ entity_type: 'action' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Priority" title="Operational attention" />
          {command.attention.length ? (
            <div className="space-y-3">
              {command.attention.map((card) => (
                <Link key={card.id} href={card.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm font-black text-slate-950">{card.title}</strong>
                    <StatusBadge value={card.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                </Link>
              ))}
            </div>
          ) : <EmptyState title="No live attention items" description="No shift priority cards were derived from live OS records." />}
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Staff cards" title="Active staff" />
            <div className="space-y-3">
              {command.workforce.map((staff) => (
                <Link key={staff.id} href={`/staff/${staff.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{staff.title}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">{staff.summary}</p>
                    </div>
                    <StatusBadge value={staff.status || 'active'} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Rapid recording" title="Quick-add types" description="Small entries, mobile layouts and explicit chronology preview." />
            <div className="grid grid-cols-2 gap-2">
              {liveRecordingRoutes.map((type) => (
                <Link key={type.id} href={type.route} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-black text-slate-700">
                  {type.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
