import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getHandoverToday } from '@/lib/os-api/connect'
import { getCommandCentre } from '@/lib/os-api/platform'

export default async function CurrentHandoverPage() {
  const [commandResult, handoverResult] = await Promise.all([getCommandCentre(), getHandoverToday()])
  const command = commandResult.data
  const handover = handoverResult.data
  const chronology = command.chronology.slice(0, 12)
  const openActions = command.actions.filter((action) => action.status !== 'completed')
  const handoverItems = handover.items || []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Handover"
        title="Current handover"
        description="A timeline-led shift handover with linked incidents, safeguarding workflow state, evidence/actions context and management sign-off readiness."
        action={<Link href="/handover/history" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">History</Link>}
      />
      <LiveDataStatus result={handoverResult.source === 'live' ? handoverResult : commandResult} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Handover items" value={handover.summary?.total || 0} detail="Schema-backed handover entries" href="/handover/current" entity={{ entity_type: 'handover' }} />
        <StatCard label="Follow-up required" value={openActions.length} detail="Needs explicit assignment" href="/actions" entity={{ entity_type: 'action' }} />
        <StatCard label="Urgent handover" value={handover.summary?.urgent || 0} detail="Important before shift starts" href="/handover/current" entity={{ entity_type: 'handover' }} />
        <StatCard label="Unacknowledged" value={handover.summary?.unacknowledged || 0} detail="Awaiting staff acknowledgement" href="/management" entity={{ entity_type: 'qa_review' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Timeline" title="Handover timeline" />
          <RecordTimeline
            items={(handoverItems.length ? handoverItems : chronology).map((item: any) => ({
              id: String(item.id),
              title: String(item.title || item.linked_record_type || 'Handover note'),
              date: String(item.created_at || item.dateTime || ''),
              body: String(item.body || item.summary || 'No summary was returned.'),
              href: item.linked_record_id ? `/chronology/${item.linked_record_id}` : item.sourceId ? `/chronology/${item.id}` : '/chronology'
            }))}
          />
        </Card>

        <Card>
          <SectionHeader eyebrow="Actions" title="Handover actions" description="Unresolved actions, safeguarding alerts, recording gaps and review items stay visible until assigned or signed off." />
          {openActions.length ? (
            <div className="space-y-3">
              {openActions.map((item) => (
              <Link key={item.id} href={`/actions/${item.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-black text-slate-950">{item.title}</strong>
                  <StatusBadge value={item.priority} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </Link>
              ))}
            </div>
          ) : <EmptyState title="No open handover actions" description="No open actions were returned by the live OS." />}
        </Card>
      </section>
    </div>
  )
}
