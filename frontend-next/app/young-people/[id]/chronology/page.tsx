import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ChronologyFoundation } from '@/components/indicare/chronology-foundation'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { getChronologyForYoungPerson, getSafeguardingChronology } from '@/lib/chronology/selectors'
import { getYoungPersonById } from '@/lib/indicare/selectors'

export default async function YoungPersonChronologyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const person = getYoungPersonById(id)
  if (!person) notFound()
  const events = getChronologyForYoungPerson(id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Young person chronology"
        title={`${person.preferredName}'s connected chronology`}
        description="Filtered chronology for this young person, including source citations, actions, evidence and regulatory links."
        action={<Link href={`/young-people/${id}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Back to record</Link>}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Events" value={events.length} />
        <StatCard label="Safeguarding" value={getSafeguardingChronology(events).length} />
        <StatCard label="Evidence linked" value={events.filter((event) => event.evidenceIds.length).length} />
        <StatCard label="Actions linked" value={events.filter((event) => event.actionIds.length).length} />
      </section>
      <ChronologyFoundation events={events} initialYoungPersonId={id} />
    </div>
  )
}
