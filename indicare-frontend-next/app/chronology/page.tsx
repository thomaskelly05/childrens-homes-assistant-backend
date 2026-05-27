import { ChronologyFoundation } from '@/components/indicare/chronology-foundation'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalBarChart, OperationalTrendChart } from '@/components/indicare/operational-cognition-widgets'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getSafeguardingChronology } from '@/lib/chronology/selectors'
import { getOsChronology } from '@/lib/os-api/chronology'
import { buildChronologyThemeData, buildChronologyTrendData } from '@/lib/operational/cognition-metrics'

function eventText(event: unknown) {
  const item = event as Record<string, unknown>
  return `${item.title || ''} ${item.summary || ''} ${item.category || ''} ${item.eventType || ''}`.toLowerCase()
}

export default async function ChronologyPage() {
  const chronology = await getOsChronology()
  const events = chronology.data
  const eventsWithEvidence = events.filter((event) => event.evidenceIds.length)
  const eventsWithActions = events.filter((event) => event.actionIds.length)
  const emotionalShifts = events.filter((event) => /emotion|settled|calm|anxious|distress|dysregulat|wellbeing/.test(eventText(event))).slice(0, 4)
  const positiveChange = events.filter((event) => /progress|achiev|positive|engaged|settled|trusted|enjoy/.test(eventText(event))).slice(0, 4)
  const escalationPatterns = events.filter((event) => /incident|missing|safeguarding|risk|police|harm|critical/.test(eventText(event))).slice(0, 4)
  const supportResponses = events.filter((event) => /support|keywork|plan|routine|debrief|repair|manager|review/.test(eventText(event))).slice(0, 4)
  const childVoice = events.filter((event) => /voice|wishes|feelings|said|choice|about me|consultation/.test(eventText(event))).slice(0, 4)
  const synthesisRows = [
    ['Repeated themes', buildChronologyThemeData(events).filter((theme) => theme.value > 0).map((theme) => `${theme.label}: ${theme.value}`).join(', ') || 'No repeated themes returned'],
    ['Emotional shifts', emotionalShifts[0]?.summary || emotionalShifts[0]?.title || 'No emotional shift marker returned'],
    ['Positive change', positiveChange[0]?.summary || positiveChange[0]?.title || 'No positive change marker returned'],
    ['Escalation patterns', escalationPatterns.length ? `${escalationPatterns.length} escalation marker(s) visible` : 'No escalation marker returned'],
    ['Support responses', supportResponses[0]?.summary || supportResponses[0]?.title || 'No support response marker returned'],
    ['Child voice visibility', childVoice.length ? `${childVoice.length} child voice marker(s) visible` : 'No child voice marker returned']
  ]

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
      <Card data-testid="chronology-meaning-synthesis">
        <SectionHeader eyebrow="Chronology synthesis" title="Meaning over time" description="Chronology now surfaces repeated themes, emotional shifts, positive change, escalation patterns, support responses and child voice visibility from the existing event stream." />
        <DataTable
          headers={['Synthesis', 'Existing chronology signal']}
          rows={synthesisRows}
          empty={<EmptyState title="No chronology synthesis" description="No chronology events were returned for synthesis." />}
        />
      </Card>
      <ChronologyFoundation events={events} />
    </div>
  )
}
