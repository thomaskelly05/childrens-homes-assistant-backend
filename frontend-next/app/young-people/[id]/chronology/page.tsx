import Link from 'next/link'
import { notFound } from 'next/navigation'

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Young person chronology"
        title={`${preferredName}'s connected chronology`}
        description="Filtered chronology for this young person, including source citations, actions, evidence and regulatory links."
        action={<Link href={`/young-people/${id}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Back to record</Link>}
      />
      <LiveDataStatus result={chronology} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Events" value={events.length} />
        <StatCard label="Safeguarding" value={getSafeguardingChronology(events).length} />
        <StatCard label="Evidence linked" value={events.filter((event) => event.evidenceIds.length).length} />
        <StatCard label="Actions linked" value={events.filter((event) => event.actionIds.length).length} />
      </section>
      {events.length ? (
        <ChronologyFoundation events={events} initialYoungPersonId={id} initialView={query.filter || query.source} />
      ) : (
        <EmptyState title="Live chronology returned 0 rows for this child" description="The /os/chronology endpoint returned no rows for this young_person_id in the current user scope." />
      )}
    </div>
  )
}
