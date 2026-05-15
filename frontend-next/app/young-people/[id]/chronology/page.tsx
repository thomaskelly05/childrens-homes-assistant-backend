import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ChronologyFoundation } from '@/components/indicare/chronology-foundation'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { getChronologyForYoungPerson, getSafeguardingChronology } from '@/lib/chronology/selectors'
import { getYoungPersonById } from '@/lib/indicare/selectors'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function YoungPersonChronologyPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string; source?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const person = getYoungPersonById(id)
  const chronology = await getOsChronology({ youngPersonId: id })
  const fallbackEvents = getChronologyForYoungPerson(id)
  const events = chronology.source === 'live' || chronology.data.length ? chronology.data : fallbackEvents
  if (!person && events.length === 0) notFound()
  const preferredName = person?.preferredName || `Young person #${id}`

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
      <ChronologyFoundation events={events} initialYoungPersonId={id} initialView={query.filter || query.source} />
    </div>
  )
}
