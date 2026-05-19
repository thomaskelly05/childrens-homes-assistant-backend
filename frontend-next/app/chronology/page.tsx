import { ChronologyFoundation } from '@/components/indicare/chronology-foundation'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalBarChart, OperationalTrendChart } from '@/components/indicare/operational-cognition-widgets'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { getSafeguardingChronology } from '@/lib/chronology/selectors'
import { getOsChronology } from '@/lib/os-api/chronology'
import { buildChronologyThemeData, buildChronologyTrendData } from '@/lib/operational/cognition-metrics'

export default async function ChronologyPage() {
  const chronology = await getOsChronology()
  const events = chronology.data
  const eventsWithEvidence = events.filter((event) => event.evidenceIds.length)
  const eventsWithActions = events.filter((event) => event.actionIds.length)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chronology"
        title="Connected care chronology"
        description="A chronology-first foundation where daily care, incidents, safeguarding, documents, evidence, actions and regulation links can be searched and cited."
      />
      <LiveDataStatus result={chronology} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Chronology events" value={events.length} detail={chronology.source === 'live' ? 'Live schema projection' : 'Live chronology unavailable'} />
        <StatCard label="Safeguarding events" value={getSafeguardingChronology(events).length} detail="Restricted and active concerns" />
        <StatCard label="Evidence linked" value={eventsWithEvidence.length} detail="Events with evidence IDs" />
        <StatCard label="Actions linked" value={eventsWithActions.length} detail="Events requiring follow-up" />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <OperationalTrendChart title="Meaning over time" description="Live chronology volume with safeguarding and high-concern overlay." data={buildChronologyTrendData(events)} />
        <OperationalBarChart title="Themes and trajectories" data={buildChronologyThemeData(events)} />
      </section>
      <ChronologyFoundation events={events} />
    </div>
  )
}
