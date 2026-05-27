import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ChildStoryTimeline } from '@/components/young-people/chronology/child-story-timeline'
import { ChronologyFoundation } from '@/components/indicare/chronology-foundation'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState, PageHeader, StatCard } from '@/components/indicare/ui'
import { getSafeguardingChronology } from '@/lib/chronology/selectors'
import { getServerOsChronology } from '@/lib/os-api/server-records'
import { getServerOsYoungPersonWorkspace } from '@/lib/os-api/server-workspaces'

export default async function YoungPersonChronologyPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string; source?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const [chronology, workspace] = await Promise.all([getServerOsChronology({ youngPersonId: id }), getServerOsYoungPersonWorkspace(id)])
  const events = chronology.data
  if (!workspace.data.youngPerson && chronology.source === 'live' && events.length === 0) notFound()
  const preferredName = workspace.data.youngPerson?.preferredName || workspace.data.youngPerson?.displayName || `Young person #${id}`

  return (
    <div data-testid="child-chronology-page" className="space-y-6">
      <PageHeader
        eyebrow="Young person chronology"
        title={`${preferredName}'s connected chronology`}
        description="Filtered chronology for this young person, including source citations, actions, evidence and regulatory links."
        action={
          <Link
            href={`/young-people/${id}/workspace`}
            data-testid="child-chronology-back-workspace"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
          >
            Child workspace
          </Link>
        }
      />
      <LiveDataStatus result={chronology} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Events" value={events.length} />
        <StatCard label="Safeguarding" value={getSafeguardingChronology(events).length} />
        <StatCard label="Evidence linked" value={events.filter((event) => event.evidenceIds.length).length} />
        <StatCard label="Actions linked" value={events.filter((event) => event.actionIds.length).length} />
      </section>
      <section data-testid="child-chronology-story-section" className="rounded-[28px] border border-sky-100 bg-white p-6">
        <h2 className="text-lg font-black text-slate-950">Story chronology (signed-off)</h2>
        <p className="mt-2 text-sm text-slate-600">Child-centred timeline from the formal archive — safe summaries only.</p>
        <div className="mt-4">
          <ChildStoryTimeline childId={id} />
        </div>
      </section>
      {events.length ? (
        <ChronologyFoundation events={events} initialYoungPersonId={id} initialView={query.filter || query.source} />
      ) : (
        <EmptyState title="No chronology entries yet" description="When records and events are signed off for this child, their story timeline will appear here." />
      )}
    </div>
  )
}
