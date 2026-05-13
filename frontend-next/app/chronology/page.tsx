import { ChronologyFoundation } from '@/components/indicare/chronology-foundation'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { getChronologyEvents, getSafeguardingChronology } from '@/lib/chronology/selectors'

export default function ChronologyPage() {
  const events = getChronologyEvents()
  const eventsWithEvidence = events.filter((event) => event.evidenceIds.length)
  const eventsWithActions = events.filter((event) => event.actionIds.length)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chronology"
        title="Connected care chronology"
        description="A chronology-first foundation where daily care, incidents, safeguarding, documents, evidence, actions and regulation links can be searched and cited."
      />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Chronology events" value={events.length} detail="Demo chronology repository" />
        <StatCard label="Safeguarding events" value={getSafeguardingChronology(events).length} detail="Restricted and active concerns" />
        <StatCard label="Evidence linked" value={eventsWithEvidence.length} detail="Events with evidence IDs" />
        <StatCard label="Actions linked" value={eventsWithActions.length} detail="Events requiring follow-up" />
      </section>
      <ChronologyFoundation events={events} />
    </div>
  )
}
